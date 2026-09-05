/**
 * ==============================================================================
 * StegoPy - LSB Image Steganography System & Server
 * Copyright (c) 2025-2026 Ahmad Zaim <ahmadzaim.gkg@gmail.com>. All Rights Reserved.
 *
 * NOTICE: Proprietary software. Unauthorized reproduction, modification, 
 * or distribution is strictly prohibited.
 * ==============================================================================
 */

import express from 'express';
import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import multer from 'multer';
import { createServer as createViteServer } from 'vite';

const app = express();
const PORT = Number(process.env.PORT) || 3000;

// Storage directories
const UPLOAD_DIR = path.join(process.cwd(), 'uploads');
const OUTPUT_DIR = path.join(process.cwd(), 'outputs');
fs.mkdirSync(UPLOAD_DIR, { recursive: true });
fs.mkdirSync(OUTPUT_DIR, { recursive: true });

// Multer config for file uploads
const storage = multer.diskStorage({
  destination: (_req, _file, cb) => {
    cb(null, UPLOAD_DIR);
  },
  filename: (_req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    cb(null, `${uniqueSuffix}-${safeName}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

app.use(express.json());

// Helper function to execute stego_engine.py across Windows/macOS/Linux
async function runPythonStego(args: string[]): Promise<any> {
  const scriptPath = path.join(process.cwd(), 'stego_engine.py');
  const candidates = [
    process.env.PYTHON_PATH,
    process.platform === 'win32' ? 'py' : 'python3',
    'python',
    'python3',
  ].filter(Boolean) as string[];

  let lastError: any = null;

  for (const cmd of candidates) {
    try {
      return await new Promise((resolve, reject) => {
        execFile(cmd, [scriptPath, ...args], { maxBuffer: 10 * 1024 * 1024 }, (err, stdout, stderr) => {
          const combined = (stdout || '') + ' ' + (stderr || '');
          if (combined.includes('Microsoft Store') || combined.includes('App execution aliases')) {
            return reject(new Error(`Windows Store Alias caught for '${cmd}'. Retrying with fallback...`));
          }
          if (err) {
            try {
              const parsed = JSON.parse(stdout || stderr);
              return reject(new Error(parsed.error || stderr || err.message));
            } catch {
              return reject(new Error(stderr || stdout || err.message));
            }
          }
          try {
            const parsed = JSON.parse(stdout.trim());
            resolve(parsed);
          } catch {
            reject(new Error(`Failed to parse Python output: ${stdout}\n${stderr}`));
          }
        });
      });
    } catch (err: any) {
      lastError = err;
      // If the error was stego logic (e.g. invalid password, capacity exceeded), throw it immediately
      const errMsg = err?.message || '';
      if (
        !errMsg.includes('Microsoft Store') &&
        !errMsg.includes('ENOENT') &&
        !errMsg.includes('not found') &&
        !errMsg.includes('is not recognized')
      ) {
        throw err;
      }
    }
  }

  throw new Error(
    lastError?.message ||
      'Python was not found. Please ensure Python is installed and added to PATH, or turn off App Execution Aliases in Windows Settings.'
  );
}

// 1. Health check
app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', python: 'ready', library: 'Pillow (PIL)' });
});

// 2. Cover image info / capacity calculation
app.post('/api/stego/info', upload.single('image'), async (req, res) => {
  try {
    let imagePath = '';
    if (req.file) {
      imagePath = req.file.path;
    } else if (req.body.sampleImage) {
      imagePath = path.join(process.cwd(), 'public', 'samples', path.basename(req.body.sampleImage));
    } else {
      return res.status(400).json({ error: 'No image provided' });
    }

    if (!fs.existsSync(imagePath)) {
      return res.status(404).json({ error: 'Image file does not exist' });
    }

    const info = await runPythonStego(['info', '--image', imagePath]);
    res.json(info);
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 3. Step 1, 2, 3: Hide Secret File in Cover Image (with optional Plausible Deniability)
app.post(
  '/api/stego/hide',
  upload.fields([
    { name: 'cover', maxCount: 1 },
    { name: 'secret', maxCount: 1 },
    { name: 'decoy', maxCount: 1 },
  ]),
  async (req, res) => {
    try {
      const files = req.files as { [fieldname: string]: Express.Multer.File[] } | undefined;

      // Handle cover path
      let coverPath = '';
      if (files && files.cover && files.cover[0]) {
        coverPath = files.cover[0].path;
      } else if (req.body.sampleCover) {
        coverPath = path.join(process.cwd(), 'public', 'samples', path.basename(req.body.sampleCover));
      } else {
        return res.status(400).json({ error: 'Cover image is required (Step 1)' });
      }

      // Handle secret path
      let secretPath = '';
      let secretOriginalName = '';
      if (files && files.secret && files.secret[0]) {
        secretPath = files.secret[0].path;
        secretOriginalName = files.secret[0].originalname;
      } else if (req.body.sampleSecret) {
        secretOriginalName = path.basename(req.body.sampleSecret);
        secretPath = path.join(process.cwd(), 'public', 'samples', secretOriginalName);
      } else if (req.body.secretText) {
        // Handle direct text payload
        const txtName = req.body.secretFilename || 'secret.txt';
        const txtPath = path.join(UPLOAD_DIR, `${Date.now()}-${txtName}`);
        fs.writeFileSync(txtPath, req.body.secretText, 'utf-8');
        secretPath = txtPath;
        secretOriginalName = txtName;
      } else {
        return res.status(400).json({ error: 'Secret file or text is required (Step 2)' });
      }

      // Ensure Python embeds the exact clean original filename into the stego header
      const secretSubdir = path.join(UPLOAD_DIR, `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`);
      fs.mkdirSync(secretSubdir, { recursive: true });
      const namedSecretPath = path.join(secretSubdir, path.basename(secretOriginalName));
      fs.copyFileSync(secretPath, namedSecretPath);

      // Handle Plausible Deniability Decoy file (if requested)
      const deniabilityMode = req.body.deniability === 'true' || req.body.deniability === true;
      let namedDecoyPath = '';
      if (deniabilityMode) {
        let decoyPath = '';
        let decoyOriginalName = '';
        if (files && files.decoy && files.decoy[0]) {
          decoyPath = files.decoy[0].path;
          decoyOriginalName = files.decoy[0].originalname;
        } else if (req.body.sampleDecoy) {
          decoyOriginalName = path.basename(req.body.sampleDecoy);
          decoyPath = path.join(process.cwd(), 'public', 'samples', decoyOriginalName);
        } else if (req.body.decoyText) {
          const dName = req.body.decoyFilename || 'decoy_notes.txt';
          const dPath = path.join(UPLOAD_DIR, `${Date.now()}-${dName}`);
          fs.writeFileSync(dPath, req.body.decoyText, 'utf-8');
          decoyPath = dPath;
          decoyOriginalName = dName;
        } else {
          // Default harmless decoy if none specified
          decoyOriginalName = 'shopping_list.txt';
          const dPath = path.join(UPLOAD_DIR, `${Date.now()}-${decoyOriginalName}`);
          fs.writeFileSync(dPath, 'Harmless Public Document:\n1. Organic milk\n2. Whole wheat bread\n3. Coffee beans\n4. Apples\n', 'utf-8');
          decoyPath = dPath;
        }
        namedDecoyPath = path.join(secretSubdir, `decoy_${path.basename(decoyOriginalName)}`);
        fs.copyFileSync(decoyPath, namedDecoyPath);
      }

      // Output stego filename (default: stego.png as requested)
      const requestedOutputName = (req.body.outputName || 'stego.png').trim().replace(/[^a-zA-Z0-9._-]/g, '_');
      const finalOutputName = requestedOutputName.endsWith('.png') ? requestedOutputName : `${requestedOutputName}.png`;
      const outputId = `stego_${Date.now()}_${finalOutputName}`;
      const outputPath = path.join(OUTPUT_DIR, outputId);

      const password = req.body.password || '';
      const decoyPassword = req.body.decoyPassword || '';
      const bits = req.body.bits ? req.body.bits.toString() : '1';

      const pyArgs = [
        'hide',
        '--cover',
        coverPath,
        '--secret',
        namedSecretPath,
        '--output',
        outputPath,
        '--bits',
        bits,
      ];

      if (password) {
        pyArgs.push('--password', password);
      }

      if (deniabilityMode) {
        pyArgs.push('--deniability');
        pyArgs.push('--decoy', namedDecoyPath);
        if (decoyPassword) {
          pyArgs.push('--decoy-password', decoyPassword);
        }
      }

      const result = await runPythonStego(pyArgs);

      console.log(`\n======================================================`);
      console.log(`[StegoPy] Stego Image Created: ${finalOutputName}`);
      console.log(`  -> True Secret Password: "${password || '(none)'}"`);
      if (deniabilityMode) {
        console.log(`  -> Decoy Password (Duress): "${decoyPassword || '(none)'}"`);
      }
      console.log(`======================================================\n`);

      // Also generate amplified difference map for visualization!
      const diffId = `diff_${Date.now()}.png`;
      const diffPath = path.join(OUTPUT_DIR, diffId);
      let diffResult = null;
      try {
        diffResult = await runPythonStego([
          'diff',
          '--cover',
          coverPath,
          '--stego',
          outputPath,
          '--output',
          diffPath,
          '--amplify',
          '80',
        ]);
      } catch (diffErr) {
        console.warn('Diff map generation warning:', diffErr);
      }

      res.json({
        ...result,
        downloadUrl: `/api/stego/file/${outputId}`,
        diffUrl: diffResult ? `/api/stego/file/${diffId}` : null,
        outputFilename: finalOutputName,
      });
    } catch (err: any) {
      res.status(500).json({ error: err.message });
    }
  },
);

// 4. Extract Secret File from Stego Image
app.post('/api/stego/extract', upload.single('stego'), async (req, res) => {
  try {
    let stegoPath = '';
    if (req.file) {
      stegoPath = req.file.path;
    } else if (req.body.existingStegoId) {
      stegoPath = path.join(OUTPUT_DIR, path.basename(req.body.existingStegoId));
    } else {
      return res.status(400).json({ error: 'Stego image file is required' });
    }

    if (!fs.existsSync(stegoPath)) {
      return res.status(404).json({ error: 'Stego image file not found' });
    }

    const extractDir = path.join(OUTPUT_DIR, `extracted_${Date.now()}`);
    fs.mkdirSync(extractDir, { recursive: true });

    const password = req.body.password || '';
    const layer = req.body.layer || '';
    const pyArgs = ['extract', '--stego', stegoPath, '--output-dir', extractDir];
    if (password) {
      pyArgs.push('--password', password);
    }
    if (layer) {
      pyArgs.push('--layer', layer);
    }

    const result = await runPythonStego(pyArgs);

    if (result.success && result.extracted_path) {
      const extractedFilename = path.basename(result.extracted_path);
      const downloadId = `${path.basename(extractDir)}/${extractedFilename}`;
      
      // If it's a text file, include content preview
      let textPreview = null;
      if (result.category === 'text' && result.size_bytes < 50000) {
        try {
          textPreview = fs.readFileSync(result.extracted_path, 'utf-8');
        } catch {
          // ignore
        }
      }

      res.json({
        ...result,
        downloadUrl: `/api/stego/extracted/${downloadId}`,
        textPreview,
      });
    } else {
      res.json(result);
    }
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// 5. Download stego images or diff maps
app.get('/api/stego/file/:filename', (req, res) => {
  const filePath = path.join(OUTPUT_DIR, path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.download(filePath, req.query.name ? String(req.query.name) : path.basename(filePath));
});

// 6. Download extracted secret file
app.get('/api/stego/extracted/:dir/:filename', (req, res) => {
  const filePath = path.join(OUTPUT_DIR, path.basename(req.params.dir), path.basename(req.params.filename));
  if (!fs.existsSync(filePath)) {
    return res.status(404).send('File not found');
  }
  res.download(filePath, path.basename(filePath));
});

// 7. Get available sample files
app.get('/api/stego/samples', (_req, res) => {
  res.json({
    covers: [
      {
        id: 'sample_cover_cyber.png',
        name: 'Cyber Wave (800x600)',
        url: '/samples/sample_cover_cyber.png',
        type: 'image/png',
        capacity: '179.7 KB',
      },
      {
        id: 'sample_cover_landscape.png',
        name: 'Sunset Nature (900x600)',
        url: '/samples/sample_cover_landscape.png',
        type: 'image/png',
        capacity: '202.2 KB',
      },
    ],
    secrets: [
      {
        id: 'secret.txt',
        name: 'secret.txt',
        category: 'text',
        label: 'Text File (secret.txt)',
        url: '/samples/secret.txt',
      },
      {
        id: 'secret.pdf',
        name: 'secret.pdf',
        category: 'document',
        label: 'Document (secret.pdf)',
        url: '/samples/secret.pdf',
      },
      {
        id: 'secret.doc',
        name: 'secret.doc',
        category: 'document',
        label: 'Document (secret.doc)',
        url: '/samples/secret.doc',
      },
      {
        id: 'secret.png',
        name: 'secret.png',
        category: 'image',
        label: 'Image File (secret.png)',
        url: '/samples/secret.png',
      },
      {
        id: 'secret.jpg',
        name: 'secret.jpg',
        category: 'image',
        label: 'Image File (secret.jpg)',
        url: '/samples/secret.jpg',
      },
    ],
  });
});

// 8. Python script code endpoint for viewing and downloading the standalone script
app.get('/api/python-code', (_req, res) => {
  const scriptPath = path.join(process.cwd(), 'stego_engine.py');
  const code = fs.readFileSync(scriptPath, 'utf-8');
  res.json({
    filename: 'stego_engine.py',
    code,
    requirements: 'Pillow>=9.0.0\n',
  });
});

// Start server with Vite middleware integration
async function startServer() {
  const isProduction =
    process.env.NODE_ENV === 'production' ||
    (typeof __filename !== 'undefined' && __filename.includes('dist'));

  if (!isProduction) {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  const server = app.listen(PORT, '0.0.0.0', () => {
    console.log(`StegoPy Server running on http://localhost:${PORT}`);
  });

  server.on('error', (err: any) => {
    if (err.code === 'EADDRINUSE') {
      const fallbackPort = PORT === 3000 ? 3001 : PORT + 1;
      console.log(`\n[Notice] Port ${PORT} is already in use (dev server running).`);
      console.log(`Automatically binding production server to: http://localhost:${fallbackPort}\n`);
      app.listen(fallbackPort, '0.0.0.0', () => {
        console.log(`StegoPy Production Server running on http://localhost:${fallbackPort}`);
      });
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer();
