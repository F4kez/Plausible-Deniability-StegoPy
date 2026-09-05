# StegoPy - LSB Image Steganography System

A steganography web application and CLI engine that conceals sensitive files (PDF, DOCX, TXT, images) inside lossless PNG carriers with **Plausible Deniability** (Decoy + True Secret layers) and a visual pixel inspector with 80× amplified difference heatmaps.

---

## 1. Prerequisites

Make sure you have the following installed on your machine:

- **Node.js**: v18.0.0 or higher ([Download Node.js](https://nodejs.org/))
- **Python**: 3.8 or higher ([Download Python](https://www.python.org/))
- **Pillow (Python Imaging Library)**:
  ```bash
  pip install pillow
  ```

---

## 2. Installation & Setup

1. Open your terminal in the project root directory.
2. Install the Node.js dependencies:
   ```bash
   npm install
   ```
3. Ensure Python and Pillow are working:
   ```bash
   python -c "from PIL import Image; print('Pillow is ready!')"
   ```
   *(On macOS or Linux, use `python3` instead of `python`).*

---

## 3. Running the Web Application

### Option A: Development Mode (Recommended for testing & development)
Starts the Vite development server with TypeScript support and hot-reload.

```bash
npm run dev
```
Open your browser at: **`http://localhost:3000`**

---

### Option B: Production Build & Start
Compiles the React frontend into static assets and bundles the backend server into `dist/server.cjs`.

1. **Build the application:**
   ```bash
   npm run build
   ```

2. **Start the production server:**
   ```bash
   npm start
   ```

*Note: If your dev server (`npm run dev`) is already running on port 3000, the production server will automatically detect it and bind to **`http://localhost:3001`** to avoid port collisions.*

---

## 4. Running the Standalone Python Engine (CLI)

You can also run the core steganography engine directly from the command line without starting the web server.

### A. Check Carrier Image Capacity
```bash
python stego_engine.py info --image public/samples/sample_cover_cyber.png
```

### B. Hide a Single Secret File
```bash
python stego_engine.py hide \
  --cover public/samples/sample_cover_cyber.png \
  --secret public/samples/secret.pdf \
  --password "MySecretPass123" \
  --output stego.png
```

### C. Hide with Plausible Deniability (True Secret + Decoy)
```bash
python stego_engine.py hide \
  --cover public/samples/sample_cover_cyber.png \
  --secret public/samples/secret.pdf \
  --password "TrueSecretPass" \
  --deniability \
  --decoy public/samples/secret.txt \
  --decoy-password "DecoyPass" \
  --output stego.png
```

### D. Extract Data Under Decoy Password (Duress)
```bash
python stego_engine.py extract \
  --stego stego.png \
  --output-dir extracted_decoy \
  --password "DecoyPass"
```

### E. Extract the True Secret
```bash
python stego_engine.py extract \
  --stego stego.png \
  --output-dir extracted_true \
  --password "TrueSecretPass"
```

### F. Generate 80× Difference Heatmap
```bash
python stego_engine.py diff \
  --cover public/samples/sample_cover_cyber.png \
  --stego stego.png \
  --output diff.png \
  --amplify 80
```

---

## 5. Project Directory Structure

```text
├── server.ts             # Express backend server (handles uploads, runs Python child processes)
├── stego_engine.py       # Standalone Python LSB Steganography engine
├── package.json          # Node scripts and dependencies
├── src/                  # React Frontend
│   ├── App.tsx           # Main application view with live stats & navigation
│   ├── components/       # UI sub-components (Hide, Extract, Inspector, Visualizer)
│   └── types.ts          # TypeScript interfaces
├── public/               # Sample images and carrier files
├── uploads/              # Temporary storage for uploaded files
└── outputs/              # Generated stego images, diff maps, and extracted files
```

---

## 6. Troubleshooting

### Port Already In Use (`EADDRINUSE: 3000`)
If port 3000 is occupied by a background process:
- **Windows PowerShell:**
  ```powershell
  taskkill /F /IM node.exe
  ```
- **Linux / macOS:**
  ```bash
  killall node
  ```
Or run the production server with an explicit port:
- **PowerShell:** `$env:PORT="3001"; npm start`
- **Linux/macOS:** `PORT=3001 npm start`

### `ModuleNotFoundError: No module named 'PIL'`
Install Pillow into your active Python environment:
```bash
pip install pillow
```

---

## 7. Cryptographic Security & Password Verification

### Why Made-Up Passwords Cannot Be Seen in the Code
In StegoPy, **passwords are never saved or hardcoded**. The system operates on a **zero-knowledge cryptographic model**:
- No passwords are saved in the source code or in any database.
- No passwords or password hashes are written inside the PNG stego image.
- Even with full access to the image file and all source code, an attacker cannot reverse-engineer or "read" what password was used.

---

### How the Program Verifies Made-Up Passwords (The Checksum Mechanism)

Instead of comparing your input against a saved password list, StegoPy verifies passwords mathematically using a combination of **Key Derivation (SHA-256 / PBKDF2)** and a **32-bit Cyclical Redundancy Checksum (CRC32)**.

#### 1. During Embedding (Encoding):
1. **Random Salt Generation**: A unique 32-bit random salt is generated:
   ```python
   salt = random.randint(0, 0xffffffff)
   ```
2. **Original Fingerprint Calculation**: The engine computes the exact CRC32 checksum of your original secret file bytes before encrypting:
   ```python
   expected_crc = zlib.crc32(file_bytes) & 0xffffffff
   ```
3. **Stream Encryption**: The made-up password and salt are hashed via SHA-256 to generate an encryption keystream, which encrypts the payload via XOR.
4. **Header Embedding**: Only the metadata (salt, payload length, and `expected_crc`) and the encrypted payload are embedded into the image pixels. The password itself is immediately discarded from memory.

#### 2. During Extraction (Verification):
When you attempt to extract the secret:
1. **Trial Decryption**: The engine reads the salt from the image and applies whatever password you typed to generate a trial keystream and decrypt the payload:
   ```python
   trial_payload = xor_crypt(encrypted_payload, trial_keystream)
   ```
2. **Mathematical Verification Check**: The engine calculates the CRC32 checksum of the decrypted result:
   ```python
   actual_crc = zlib.crc32(trial_payload) & 0xffffffff
   ```
3. **The Outcome**:
   - ❌ **Incorrect Password**: Because AES/stream encryption is avalanche-sensitive, decrypting with even one wrong character produces random mathematical noise. The checksum of this garbage will **never** equal `expected_crc`. The program immediately rejects it:  
     `"Incorrect password! Checksum verification failed."`
   - ✅ **Correct Password**: The trial payload decrypts into the exact original file bit-for-bit. `actual_crc == expected_crc` matches with 100% precision, confirming identity and data integrity without ever storing the password.

---

### Plausible Deniability (Dual-Layer Separation)

Under duress mode, the carrier image contains two entirely separate layers:
- **Bit Plane 0 (Decoy)**: Encrypted with the Decoy Password + Decoy Salt + Decoy CRC32.
- **Bit Plane 1 (True Secret)**: Encrypted with the True Secret Password + True Secret Salt + True Secret CRC32.

An adversary who forces you to reveal your password will only receive the Decoy Password. Because both layers are encrypted into pseudo-random noise, statistical analysis cannot prove whether a second secret layer exists.

---

## 8. Author & Legal Copyright

**Copyright FAKEZ (<fakeztua@gmail.com>). All Rights Reserved.**

This project and its proprietary source code, algorithms, visual steganography workflows, and documentation are the exclusive intellectual property of **Ahmad Zaim**.

- **No Unauthorized Duplication**: You may not copy, clone, mirror, re-license, or redistribute this software in whole or in part without explicit written authorization.
- **No Commercial Exploitation**: Commercial use, sublicensing, or redistribution for profit is strictly prohibited.
- **Infringement Notice**: Any unauthorized distribution or plagiarism of this codebase is subject to international copyright infringement claims and DMCA takedown actions.

