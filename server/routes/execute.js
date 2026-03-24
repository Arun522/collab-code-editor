import { Router } from 'express';
import { execFile } from 'child_process';
import { writeFile, unlink, mkdir } from 'fs/promises';
import { join } from 'path';
import { randomUUID } from 'crypto';
import { authenticate } from '../middleware/auth.js';

const router = Router();
router.use(authenticate);

const TEMP_DIR = join(process.cwd(), '.tmp-exec');

// Ensure temp dir exists
mkdir(TEMP_DIR, { recursive: true }).catch(() => {});

const LANGUAGE_CONFIG = {
  python: {
    ext: '.py',
    cmd: 'python3',
    args: (file) => [file],
  },
  java: {
    ext: '.java',
    cmd: 'javac',
    // Java needs compile + run
    compile: (file) => ['javac', [file]],
    run: (dir, className) => ['java', ['-cp', dir, className]],
  },
  cpp: {
    ext: '.cpp',
    cmd: 'g++',
    compile: (file, outFile) => ['g++', ['-o', outFile, file]],
    run: (dir, outFile) => [outFile, []],
  },
  typescript: {
    ext: '.ts',
    cmd: 'npx',
    args: (file) => ['tsx', file],
  },
};

const TIMEOUT_MS = 10000;
const MAX_OUTPUT = 10000; // chars

function runProcess(cmd, args, timeout = TIMEOUT_MS) {
  return new Promise((resolve) => {
    const proc = execFile(cmd, args, {
      timeout,
      maxBuffer: 1024 * 1024,
      env: { ...process.env, PATH: process.env.PATH },
    }, (error, stdout, stderr) => {
      let output = stdout || '';
      let errorOutput = stderr || '';

      if (error && error.killed) {
        errorOutput += '\n[Execution timed out]';
      } else if (error && !stderr) {
        errorOutput += error.message;
      }

      resolve({
        stdout: output.substring(0, MAX_OUTPUT),
        stderr: errorOutput.substring(0, MAX_OUTPUT),
        exitCode: error ? error.code || 1 : 0,
      });
    });
  });
}

router.post('/', async (req, res) => {
  const { code, language } = req.body;

  if (!code || !language) {
    return res.status(400).json({ error: 'Code and language are required' });
  }

  // JavaScript runs client-side only
  if (language === 'javascript') {
    return res.status(400).json({ error: 'JavaScript executes client-side' });
  }

  const config = LANGUAGE_CONFIG[language];
  if (!config) {
    return res.status(400).json({
      error: `Server-side execution not supported for ${language}. Supported: ${Object.keys(LANGUAGE_CONFIG).join(', ')}`,
    });
  }

  const id = randomUUID();
  const fileBase = join(TEMP_DIR, id);

  try {
    if (language === 'java') {
      // Extract class name from code
      const classMatch = code.match(/class\s+(\w+)/);
      const className = classMatch ? classMatch[1] : 'Main';
      const filePath = join(TEMP_DIR, `${className}.java`);

      await writeFile(filePath, code);

      // Compile
      const [compileCmd, compileArgs] = config.compile(filePath);
      const compileResult = await runProcess(compileCmd, compileArgs);

      if (compileResult.exitCode !== 0) {
        await cleanup([filePath]);
        return res.json({
          stdout: '',
          stderr: `Compilation Error:\n${compileResult.stderr}`,
          exitCode: compileResult.exitCode,
        });
      }

      // Run
      const [runCmd, runArgs] = config.run(TEMP_DIR, className);
      const result = await runProcess(runCmd, runArgs);

      await cleanup([
        filePath,
        join(TEMP_DIR, `${className}.class`),
      ]);

      return res.json(result);
    }

    if (language === 'cpp') {
      const filePath = `${fileBase}.cpp`;
      const outPath = `${fileBase}.out`;

      await writeFile(filePath, code);

      // Compile
      const [compileCmd, compileArgs] = config.compile(filePath, outPath);
      const compileResult = await runProcess(compileCmd, compileArgs);

      if (compileResult.exitCode !== 0) {
        await cleanup([filePath]);
        return res.json({
          stdout: '',
          stderr: `Compilation Error:\n${compileResult.stderr}`,
          exitCode: compileResult.exitCode,
        });
      }

      // Run
      const [runCmd, runArgs] = config.run(TEMP_DIR, outPath);
      const result = await runProcess(runCmd, runArgs);

      await cleanup([filePath, outPath]);
      return res.json(result);
    }

    // Simple interpreted languages (python, typescript)
    const filePath = `${fileBase}${config.ext}`;
    await writeFile(filePath, code);

    const result = await runProcess(config.cmd, config.args(filePath));

    await cleanup([filePath]);
    return res.json(result);
  } catch (err) {
    return res.status(500).json({
      stdout: '',
      stderr: `Execution error: ${err.message}`,
      exitCode: 1,
    });
  }
});

async function cleanup(files) {
  for (const f of files) {
    try { await unlink(f); } catch {}
  }
}

export default router;
