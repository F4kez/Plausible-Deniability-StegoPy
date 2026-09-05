import os
import sys
import json
import zlib
import hashlib
import struct
import argparse
from typing import Dict, Any, Tuple, Optional

try:
    from PIL import Image
    PIL_AVAILABLE = True
except ImportError:
    PIL_AVAILABLE = False

# Magic signature constants for steganography detection
# Standard single payload format:
MAGIC_STANDARD = b"STEG\x02"       # 5 bytes
# Plausible Deniability Dual-Payload format:
MAGIC_DENIABILITY = b"PDEN\x01"    # 5 bytes


def format_bytes(size: int) -> str:
    """Helper to format byte sizes cleanly."""
    if size < 1024:
        return f"{size} B"
    elif size < 1024 * 1024:
        return f"{size / 1024:.1f} KB"
    else:
        return f"{size / (1024 * 1024):.2f} MB"


def derive_key_keystream(password: str, salt: int, length: int) -> bytes:
    """
    Derives a cryptographic pseudorandom byte stream using SHA-256 in counter mode.
    Deterministic given the password and 32-bit salt.
    """
    salt_bytes = struct.pack(">I", salt)
    seed = hashlib.sha256(password.encode('utf-8') + salt_bytes).digest()
    
    keystream = bytearray()
    counter = 0
    while len(keystream) < length:
        counter_bytes = struct.pack(">I", counter)
        block = hashlib.sha256(seed + counter_bytes).digest()
        keystream.extend(block)
        counter += 1
        
    return bytes(keystream[:length])


def xor_crypt(data: bytes, keystream: bytes) -> bytes:
    """Symmetric XOR encryption/decryption using a deterministic keystream."""
    return bytes(a ^ b for a, b in zip(data, keystream))


def get_image_capacity(width: int, height: int, bits_per_channel: int = 1) -> Dict[str, Any]:
    """Calculates maximum secret payload storage capacity in bytes."""
    total_pixels = width * height
    total_channels = total_pixels * 3  # RGB channels
    total_embeddable_bits = total_channels * bits_per_channel
    raw_capacity_bytes = total_embeddable_bits // 8
    # Reserve overhead for metadata header (magic, flags, sizes, CRC32, filename)
    usable_capacity_bytes = max(0, raw_capacity_bytes - 256)
    
    return {
        "width": width,
        "height": height,
        "total_pixels": total_pixels,
        "bits_per_channel": bits_per_channel,
        "raw_capacity_bytes": raw_capacity_bytes,
        "usable_capacity_bytes": usable_capacity_bytes,
        "formatted_usable": format_bytes(usable_capacity_bytes)
    }


def prepare_payload_block(
    file_bytes: bytes,
    filename: str,
    password: str = "",
    compress: bool = True
) -> Tuple[bytes, Dict[str, Any]]:
    """
    Packages a file into a serialized block with compression, optional encryption, and CRC32.
    Format:
      1 byte: flags (0x01 = compressed, 0x02 = encrypted)
      4 bytes: salt
      2 bytes: filename length
      N bytes: filename
      4 bytes: payload length
      4 bytes: original uncompressed size
      4 bytes: original CRC32
      X bytes: payload
    """
    import random
    original_size = len(file_bytes)
    filename_bytes = filename.encode('utf-8')[:65535]
    data_crc = zlib.crc32(file_bytes) & 0xffffffff

    flags = 0
    processed_payload = file_bytes
    if compress:
        compressed = zlib.compress(file_bytes, level=9)
        if len(compressed) < len(file_bytes):
            processed_payload = compressed
            flags |= 0x01

    salt = random.randint(0, 0xffffffff)
    if password:
        flags |= 0x02
        keystream = derive_key_keystream(password, salt, len(processed_payload))
        processed_payload = xor_crypt(processed_payload, keystream)

    block = (
        struct.pack(">BIH", flags, salt, len(filename_bytes)) +
        filename_bytes +
        struct.pack(">III", len(processed_payload), original_size, data_crc) +
        processed_payload
    )

    info = {
        "filename": filename,
        "original_size": original_size,
        "formatted_size": format_bytes(original_size),
        "stored_payload_size": len(processed_payload),
        "compressed": bool(flags & 0x01),
        "encrypted": bool(flags & 0x02),
        "block_size": len(block)
    }
    return block, info


def unpack_payload_block(block_bytes: bytes, password: str = "") -> Dict[str, Any]:
    """Unpacks, decrypts, and decompresses a serialized payload block."""
    if len(block_bytes) < 19:
        raise ValueError("Invalid payload block length.")

    flags, salt, filename_len = struct.unpack(">BIH", block_bytes[:7])
    offset = 7
    if offset + filename_len > len(block_bytes):
        raise ValueError("Malformed filename length in block.")
    
    filename_bytes = block_bytes[offset:offset + filename_len]
    filename = filename_bytes.decode('utf-8', errors='replace')
    offset += filename_len

    if offset + 12 > len(block_bytes):
        raise ValueError("Malformed metadata in block.")
    
    payload_len, orig_size, expected_crc = struct.unpack(">III", block_bytes[offset:offset + 12])
    offset += 12

    payload = block_bytes[offset:offset + payload_len]
    if len(payload) != payload_len:
        raise ValueError(f"Truncated payload: expected {payload_len} bytes, found {len(payload)}")

    is_encrypted = bool(flags & 0x02)
    if is_encrypted:
        if not password:
            return {
                "success": False,
                "password_required": True,
                "filename": filename,
                "payload_size": payload_len,
                "error": "Password required for this layer."
            }
        keystream = derive_key_keystream(password, salt, len(payload))
        payload = xor_crypt(payload, keystream)

    is_compressed = bool(flags & 0x01)
    if is_compressed:
        try:
            payload = zlib.decompress(payload)
        except Exception as e:
            if is_encrypted:
                return {
                    "success": False,
                    "password_required": True,
                    "filename": filename,
                    "error": "Incorrect password or corrupt compressed data."
                }
            raise ValueError(f"Decompression error: {e}")

    actual_crc = zlib.crc32(payload) & 0xffffffff
    if actual_crc != expected_crc:
        if is_encrypted:
            return {
                "success": False,
                "password_required": True,
                "filename": filename,
                "error": "Incorrect password! Checksum verification failed."
            }
        raise ValueError("Integrity check failed! Corrupted or tampered data.")

    return {
        "success": True,
        "filename": filename,
        "data": payload,
        "size_bytes": len(payload),
        "formatted_size": format_bytes(len(payload)),
        "crc_verified": True,
        "crc32_hex": hex(actual_crc),
        "is_compressed": is_compressed,
        "is_encrypted": is_encrypted
    }


def encode_secret_file(
    cover_image_path: str,
    secret_file_path: str,
    output_image_path: str,
    password: str = "",
    bits_per_channel: int = 1,
    compress: bool = True,
    # Plausible Deniability Parameters:
    deniability_mode: bool = False,
    decoy_file_path: Optional[str] = None,
    decoy_password: str = ""
) -> Dict[str, Any]:
    """
    Hide secret files inside cover image.
    Supports either:
    1. Standard Single Payload: Encodes secret payload into bit plane 0 (or configured bpc).
    2. Plausible Deniability Dual-Payload:
       - Decoy payload is embedded in Bit Plane 0 (LSB0), accessible with decoy password.
       - Hidden True Secret is embedded in Bit Plane 1 (LSB1), completely independent.
       - Under duress, giving the Decoy password unlocks the Decoy file without revealing
         the presence of the true secret.
    """
    if not PIL_AVAILABLE:
        raise RuntimeError("Pillow library is not installed.")

    cover = Image.open(cover_image_path)
    has_alpha = cover.mode == "RGBA"
    img_rgb = cover.convert("RGB")
    width, height = img_rgb.size
    pixels = list(img_rgb.getdata())
    total_channels = len(pixels) * 3

    if deniability_mode:
        # Require both secret and decoy
        if not decoy_file_path or not os.path.exists(decoy_file_path):
            raise ValueError("Decoy file is required for Plausible Deniability mode.")
        if not os.path.exists(secret_file_path):
            raise ValueError(f"True secret file not found: {secret_file_path}")

        with open(decoy_file_path, "rb") as f:
            decoy_bytes = f.read()
        with open(secret_file_path, "rb") as f:
            secret_bytes = f.read()

        decoy_filename = os.path.basename(decoy_file_path)
        secret_filename = os.path.basename(secret_file_path)

        # Prepare both blocks
        decoy_block, decoy_info = prepare_payload_block(decoy_bytes, decoy_filename, decoy_password, compress)
        secret_block, secret_info = prepare_payload_block(secret_bytes, secret_filename, password, compress)

        # Layer 1 (Decoy) is written into Bit 0 of RGB channels (1 bit/channel = total_channels bits)
        # Layer 2 (True Secret) is written into Bit 1 of RGB channels (1 bit/channel = total_channels bits)
        decoy_stream = MAGIC_DENIABILITY + b"\x01" + struct.pack(">I", len(decoy_block)) + decoy_block
        secret_stream = MAGIC_DENIABILITY + b"\x02" + struct.pack(">I", len(secret_block)) + secret_block

        decoy_bits = []
        for b in decoy_stream:
            for i in range(7, -1, -1):
                decoy_bits.append((b >> i) & 1)

        secret_bits = []
        for b in secret_stream:
            for i in range(7, -1, -1):
                secret_bits.append((b >> i) & 1)

        if len(decoy_bits) > total_channels:
            raise ValueError(f"Decoy file too large! Exceeds capacity ({format_bytes(total_channels // 8)})")
        if len(secret_bits) > total_channels:
            raise ValueError(f"True secret file too large! Exceeds capacity ({format_bytes(total_channels // 8)})")

        new_pixels = []
        altered_pixels_count = 0
        d_idx = 0
        s_idx = 0
        num_d = len(decoy_bits)
        num_s = len(secret_bits)

        for r, g, b in pixels:
            pixel_altered = False
            channels = [r, g, b]
            for c in range(3):
                orig_val = channels[c]
                # Bit 0: Decoy
                b0 = (orig_val & 1)
                if d_idx < num_d:
                    b0 = decoy_bits[d_idx]
                    d_idx += 1
                # Bit 1: True Secret
                b1 = (orig_val >> 1) & 1
                if s_idx < num_s:
                    b1 = secret_bits[s_idx]
                    s_idx += 1
                
                # Reassemble: Keep bits 2..7 unchanged, set bit 1 = b1, set bit 0 = b0
                new_val = (orig_val & ~0x03) | (b1 << 1) | b0
                if new_val != orig_val:
                    pixel_altered = True
                channels[c] = new_val

            if pixel_altered:
                altered_pixels_count += 1
            new_pixels.append(tuple(channels))

        stego_img = Image.new("RGB", (width, height))
        stego_img.putdata(new_pixels)
        if has_alpha:
            stego_img.putalpha(cover.split()[3])

        os.makedirs(os.path.dirname(os.path.abspath(output_image_path)), exist_ok=True)
        stego_img.save(output_image_path, format="PNG", optimize=False)
        mse, psnr = calculate_psnr(img_rgb, stego_img.convert("RGB"))

        return {
            "success": True,
            "deniability_mode": True,
            "output_path": output_image_path,
            "cover_info": {
                "width": width,
                "height": height,
                "format": cover.format or "PNG",
                "file_size": os.path.getsize(cover_image_path)
            },
            "stego_info": {
                "file_size": os.path.getsize(output_image_path),
                "format": "PNG",
                "psnr_db": round(psnr, 2) if psnr != float('inf') else "Inf (Identical)",
                "mse": round(mse, 4),
                "pixels_altered": altered_pixels_count,
                "pixels_altered_pct": round((altered_pixels_count / len(pixels)) * 100, 2)
            },
            "decoy_info": decoy_info,
            "secret_info": secret_info
        }

    else:
        # Standard Single Payload Mode
        with open(secret_file_path, "rb") as f:
            secret_bytes = f.read()

        secret_filename = os.path.basename(secret_file_path)
        payload_block, info = prepare_payload_block(secret_bytes, secret_filename, password, compress)

        header_prefix = struct.pack(">5sB", MAGIC_STANDARD, bits_per_channel)
        full_payload = header_prefix + payload_block

        capacity_info = get_image_capacity(width, height, bits_per_channel)
        if len(full_payload) > capacity_info["raw_capacity_bytes"]:
            raise ValueError(
                f"Secret file is too large! Needed {format_bytes(len(full_payload))}, "
                f"but cover image can only hold {format_bytes(capacity_info['raw_capacity_bytes'])}."
            )

        bit_array = []
        for b in full_payload:
            for i in range(7, -1, -1):
                bit_array.append((b >> i) & 1)

        new_pixels = []
        bit_idx = 0
        total_bits = len(bit_array)
        mask = (1 << bits_per_channel) - 1
        altered_pixels_count = 0

        for r, g, b in pixels:
            pixel_altered = False
            channels = [r, g, b]
            for c in range(3):
                if bit_idx < total_bits:
                    chunk = 0
                    for _ in range(bits_per_channel):
                        if bit_idx < total_bits:
                            chunk = (chunk << 1) | bit_array[bit_idx]
                            bit_idx += 1
                        else:
                            chunk = (chunk << 1)
                    orig_val = channels[c]
                    new_val = (orig_val & (~mask)) | chunk
                    if new_val != orig_val:
                        pixel_altered = True
                    channels[c] = new_val
            if pixel_altered:
                altered_pixels_count += 1
            new_pixels.append(tuple(channels))

        stego_img = Image.new("RGB", (width, height))
        stego_img.putdata(new_pixels)
        if has_alpha:
            stego_img.putalpha(cover.split()[3])

        os.makedirs(os.path.dirname(os.path.abspath(output_image_path)), exist_ok=True)
        stego_img.save(output_image_path, format="PNG", optimize=False)
        mse, psnr = calculate_psnr(img_rgb, stego_img.convert("RGB"))

        return {
            "success": True,
            "deniability_mode": False,
            "output_path": output_image_path,
            "cover_info": {
                "width": width,
                "height": height,
                "format": cover.format or "PNG",
                "file_size": os.path.getsize(cover_image_path)
            },
            "stego_info": {
                "file_size": os.path.getsize(output_image_path),
                "format": "PNG",
                "psnr_db": round(psnr, 2) if psnr != float('inf') else "Inf (Identical)",
                "mse": round(mse, 4),
                "pixels_altered": altered_pixels_count,
                "pixels_altered_pct": round((altered_pixels_count / len(pixels)) * 100, 2)
            },
            "secret_info": info
        }


def decode_secret_file(
    stego_image_path: str,
    output_dir: str,
    password: str = "",
    force_layer: Optional[str] = None
) -> Dict[str, Any]:
    """
    Extracts hidden file from a stego image.
    Supports:
    - Standard Single Payload
    - Plausible Deniability Dual-Payload:
      Extracts Decoy Layer (Plane 0) or Hidden Secret Layer (Plane 1).
      If password matches either Decoy or Secret, it unpacks that layer seamlessly.
    """
    if not PIL_AVAILABLE:
        raise RuntimeError("Pillow library is not installed.")

    if not os.path.exists(stego_image_path):
        raise FileNotFoundError(f"Stego image not found: {stego_image_path}")

    stego_img = Image.open(stego_image_path).convert("RGB")
    width, height = stego_img.size
    pixels = list(stego_img.getdata())

    # Check for Plausible Deniability Header in Plane 0 (Bit 0) and Plane 1 (Bit 1)
    def extract_plane_bytes(bit_plane: int, max_bytes: int = 1024) -> bytearray:
        extracted_bits = []
        target_bits = max_bytes * 8
        for r, g, b in pixels:
            for ch in (r, g, b):
                bit = (ch >> bit_plane) & 1
                extracted_bits.append(bit)
                if len(extracted_bits) >= target_bits:
                    break
            if len(extracted_bits) >= target_bits:
                break
        buf = bytearray()
        for i in range(0, len(extracted_bits) - 7, 8):
            b = 0
            for j in range(8):
                b = (b << 1) | extracted_bits[i + j]
            buf.append(b)
        return buf

    # Check Plane 0 for PDEN\x01
    prefix_p0 = extract_plane_bytes(0, 32)
    is_deniability = prefix_p0.startswith(MAGIC_DENIABILITY)

    if is_deniability:
        # We have a Plausible Deniability Dual-Payload carrier!
        # Layer 1 (Decoy) is on bit plane 0
        # Layer 2 (True Secret) is on bit plane 1
        # Helper to read entire bit plane stream
        def read_full_plane(bit_plane: int) -> bytes:
            extracted_bits = []
            for r, g, b in pixels:
                for ch in (r, g, b):
                    extracted_bits.append((ch >> bit_plane) & 1)
            buf = bytearray()
            for i in range(0, len(extracted_bits) - 7, 8):
                b = 0
                for j in range(8):
                    b = (b << 1) | extracted_bits[i + j]
                buf.append(b)
            return bytes(buf)

        plane0_bytes = read_full_plane(0)
        plane1_bytes = read_full_plane(1)

        # Inspect both layers
        layers_available = []
        p0_valid = plane0_bytes.startswith(MAGIC_DENIABILITY)
        p1_valid = plane1_bytes.startswith(MAGIC_DENIABILITY)

        if p0_valid:
            layers_available.append("decoy")
        if p1_valid:
            layers_available.append("true_secret")

        # Determine which layer to decrypt
        # If user forces a layer, or tries both passwords:
        chosen_layer = None
        unpacked = None

        def try_unpack_plane(plane_data: bytes, layer_name: str):
            if not plane_data.startswith(MAGIC_DENIABILITY):
                return None
            # MAGIC (5) + layer_tag (1) + block_len (4)
            offset = 6
            block_len = struct.unpack(">I", plane_data[offset:offset+4])[0]
            offset += 4
            block_bytes = plane_data[offset:offset+block_len]
            return unpack_payload_block(block_bytes, password)

        # Try Decoy first or True Secret
        # If password is provided:
        if force_layer == "decoy":
            res0 = try_unpack_plane(plane0_bytes, "decoy")
            chosen_layer = "Decoy Layer (Under-Duress)"
            unpacked = res0
        elif force_layer == "secret":
            res1 = try_unpack_plane(plane1_bytes, "true_secret")
            chosen_layer = "True Secret Layer"
            unpacked = res1
        else:
            # Automatic password resolver:
            # First try true secret (Plane 1)
            res1 = try_unpack_plane(plane1_bytes, "true_secret")
            if res1 and res1.get("success"):
                chosen_layer = "True Secret Layer"
                unpacked = res1
            else:
                # Try Decoy (Plane 0)
                res0 = try_unpack_plane(plane0_bytes, "decoy")
                if res0 and res0.get("success"):
                    chosen_layer = "Decoy Layer (Under-Duress)"
                    unpacked = res0
                else:
                    # Neither succeeded with this password; report password required
                    # In true plausible deniability, decoy error is presented first
                    chosen_layer = "Protected Dual-Layer"
                    unpacked = res0 or res1

        if not unpacked:
            raise ValueError("Corrupted plausible deniability stego layers.")

        if not unpacked.get("success"):
            return {
                "success": False,
                "deniability_detected": True,
                "password_required": unpacked.get("password_required", True),
                "filename": unpacked.get("filename", "unknown"),
                "error": unpacked.get("error", "Password required or incorrect password.")
            }

        # Save extracted file
        os.makedirs(output_dir, exist_ok=True)
        safe_filename = os.path.basename(unpacked["filename"]) or "extracted_file.bin"
        extracted_path = os.path.join(output_dir, safe_filename)
        with open(extracted_path, "wb") as f:
            f.write(unpacked["data"])

        ext = os.path.splitext(safe_filename)[1].lower()
        category = "other"
        if ext in (".txt", ".md", ".csv", ".json", ".xml", ".log", ".py", ".js", ".html"):
            category = "text"
        elif ext in (".pdf", ".doc", ".docx", ".rtf", ".odt", ".xls", ".xlsx", ".ppt", ".pptx"):
            category = "document"
        elif ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"):
            category = "image"

        return {
            "success": True,
            "deniability_mode": True,
            "active_layer": chosen_layer,
            "filename": safe_filename,
            "extracted_path": extracted_path,
            "size_bytes": unpacked["size_bytes"],
            "formatted_size": unpacked["formatted_size"],
            "crc_verified": True,
            "crc32_hex": unpacked["crc32_hex"],
            "category": category,
            "is_compressed": unpacked["is_compressed"],
            "is_encrypted": unpacked["is_encrypted"]
        }

    # Otherwise: Standard Single Payload
    # Check standard bpc 1, 2, 4
    detected_bpc = None
    for candidate_bpc in (1, 2, 4):
        mask = (1 << candidate_bpc) - 1
        extracted_bits = []
        target_bits = 64 * 8
        for r, g, b in pixels:
            for ch in (r, g, b):
                val = ch & mask
                for shift in range(candidate_bpc - 1, -1, -1):
                    extracted_bits.append((val >> shift) & 1)
                    if len(extracted_bits) >= target_bits:
                        break
                if len(extracted_bits) >= target_bits:
                    break
            if len(extracted_bits) >= target_bits:
                break

        extracted_bytes = bytearray()
        for i in range(0, len(extracted_bits) - 7, 8):
            b = 0
            for j in range(8):
                b = (b << 1) | extracted_bits[i + j]
            extracted_bytes.append(b)

        if extracted_bytes.startswith(MAGIC_STANDARD):
            detected_bpc = candidate_bpc
            break

    if detected_bpc is None:
        raise ValueError("No hidden data detected in this image! Ensure this is a valid stego image.")

    mask = (1 << detected_bpc) - 1
    def bit_generator():
        for r, g, b in pixels:
            for ch in (r, g, b):
                val = ch & mask
                for shift in range(detected_bpc - 1, -1, -1):
                    yield (val >> shift) & 1

    gen = bit_generator()
    def read_bytes(count: int) -> bytes:
        buf = bytearray()
        for _ in range(count):
            b = 0
            for _ in range(8):
                b = (b << 1) | next(gen)
            buf.append(b)
        return bytes(buf)

    prefix_data = read_bytes(6)
    magic, bpc_val = struct.unpack(">5sB", prefix_data)

    # Now read the rest of the stream into bytes buffer
    # Read remaining capacity or up to image capacity
    remaining_bytes_max = (width * height * 3 * detected_bpc) // 8
    remaining_bytes = read_bytes(remaining_bytes_max - 6)
    
    unpacked = unpack_payload_block(remaining_bytes, password)
    if not unpacked.get("success"):
        return {
            "success": False,
            "deniability_mode": False,
            "password_required": unpacked.get("password_required", True),
            "filename": unpacked.get("filename", "unknown"),
            "error": unpacked.get("error", "Password required or incorrect password.")
        }

    os.makedirs(output_dir, exist_ok=True)
    safe_filename = os.path.basename(unpacked["filename"]) or "extracted_file.bin"
    extracted_path = os.path.join(output_dir, safe_filename)
    with open(extracted_path, "wb") as f:
        f.write(unpacked["data"])

    ext = os.path.splitext(safe_filename)[1].lower()
    category = "other"
    if ext in (".txt", ".md", ".csv", ".json", ".xml", ".log", ".py", ".js", ".html"):
        category = "text"
    elif ext in (".pdf", ".doc", ".docx", ".rtf", ".odt", ".xls", ".xlsx", ".ppt", ".pptx"):
        category = "document"
    elif ext in (".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"):
        category = "image"

    return {
        "success": True,
        "deniability_mode": False,
        "filename": safe_filename,
        "extracted_path": extracted_path,
        "size_bytes": unpacked["size_bytes"],
        "formatted_size": unpacked["formatted_size"],
        "crc_verified": True,
        "crc32_hex": unpacked["crc32_hex"],
        "category": category,
        "is_compressed": unpacked["is_compressed"],
        "is_encrypted": unpacked["is_encrypted"]
    }


def calculate_psnr(img1: Image.Image, img2: Image.Image) -> Tuple[float, float]:
    """Compute Mean Squared Error (MSE) and Peak Signal-to-Noise Ratio (PSNR)."""
    p1 = list(img1.getdata())
    p2 = list(img2.getdata())
    if len(p1) != len(p2):
        return (0.0, 0.0)

    total_diff_sq = 0.0
    total_samples = len(p1) * 3

    for c1, c2 in zip(p1, p2):
        total_diff_sq += (c1[0] - c2[0]) ** 2
        total_diff_sq += (c1[1] - c2[1]) ** 2
        total_diff_sq += (c1[2] - c2[2]) ** 2

    mse = total_diff_sq / total_samples
    if mse == 0:
        return (0.0, float('inf'))
    
    import math
    max_pixel = 255.0
    psnr = 20 * math.log10(max_pixel / math.sqrt(mse))
    return (mse, psnr)


def generate_diff_image(cover_path: str, stego_path: str, output_path: str, amplify: int = 80) -> Dict[str, Any]:
    """Amplifies pixel differences between original and stego to create visual difference map."""
    c_img = Image.open(cover_path).convert("RGB")
    s_img = Image.open(stego_path).convert("RGB")

    w = min(c_img.width, s_img.width)
    h = min(c_img.height, s_img.height)

    c_pixels = list(c_img.getdata())
    s_pixels = list(s_img.getdata())

    diff_pixels = []
    altered_count = 0

    for cp, sp in zip(c_pixels, s_pixels):
        dr = abs(cp[0] - sp[0]) * amplify
        dg = abs(cp[1] - sp[1]) * amplify
        db = abs(cp[2] - sp[2]) * amplify

        if dr > 0 or dg > 0 or db > 0:
            altered_count += 1
            # Render altered pixels with high-visibility neon cyber tint
            diff_pixels.append((min(255, 30 + dr), min(255, 230 + dg), min(255, 255 + db)))
        else:
            # Clean dark background for non-altered pixels
            diff_pixels.append((15, 23, 42))

    diff_img = Image.new("RGB", (w, h))
    diff_img.putdata(diff_pixels)
    os.makedirs(os.path.dirname(os.path.abspath(output_path)), exist_ok=True)
    diff_img.save(output_path, format="PNG")

    return {
        "success": True,
        "diff_path": output_path,
        "altered_pixels": altered_count,
        "total_pixels": len(c_pixels),
        "amplify_factor": amplify
    }


def main():
    parser = argparse.ArgumentParser(description="StegoPy: Python LSB Steganography Engine with Plausible Deniability")
    subparsers = parser.add_subparsers(dest="command", required=True)

    # Info subparser
    info_parser = subparsers.add_parser("info", help="Inspect image stego capacity")
    info_parser.add_argument("--image", required=True, help="Path to cover image")

    # Hide subparser
    hide_parser = subparsers.add_parser("hide", help="Hide secret file into cover image")
    hide_parser.add_argument("--cover", required=True, help="Path to cover image")
    hide_parser.add_argument("--secret", required=True, help="Path to secret file")
    hide_parser.add_argument("--output", default="stego.png", help="Path to output stego image")
    hide_parser.add_argument("--password", default="", help="Optional encryption password for true secret")
    hide_parser.add_argument("--bits", type=int, default=1, choices=[1, 2, 4], help="LSB bits per channel")
    hide_parser.add_argument("--no-compress", action="store_true", help="Disable zlib compression")
    # Plausible Deniability Options
    hide_parser.add_argument("--deniability", action="store_true", help="Enable Plausible Deniability dual-payload mode")
    hide_parser.add_argument("--decoy", default="", help="Path to decoy file (for plausible deniability)")
    hide_parser.add_argument("--decoy-password", default="", help="Password for decoy file (under duress)")

    # Extract subparser
    extract_parser = subparsers.add_parser("extract", help="Extract hidden file from stego image")
    extract_parser.add_argument("--stego", required=True, help="Path to stego image")
    extract_parser.add_argument("--output-dir", default="extracted", help="Directory to save extracted file")
    extract_parser.add_argument("--password", default="", help="Decryption password (real or decoy password)")
    extract_parser.add_argument("--layer", choices=["decoy", "secret"], default=None, help="Force specific layer extraction in dual-layer mode")

    # Diff subparser
    diff_parser = subparsers.add_parser("diff", help="Generate amplified pixel difference map")
    diff_parser.add_argument("--cover", required=True, help="Path to original cover image")
    diff_parser.add_argument("--stego", required=True, help="Path to stego image")
    diff_parser.add_argument("--output", default="diff.png", help="Path to output difference image")
    diff_parser.add_argument("--amplify", type=int, default=80, help="Amplification factor")

    args = parser.parse_args()

    try:
        if args.command == "info":
            img = Image.open(args.image)
            w, h = img.size
            cap1 = get_image_capacity(w, h, 1)
            cap2 = get_image_capacity(w, h, 2)
            result = {
                "width": w,
                "height": h,
                "format": img.format or "PNG",
                "dimensions": f"{w}x{h}",
                "pixels": w * h,
                "file_size": os.path.getsize(args.image),
                "capacities": {
                    "1_bit_lsb": cap1,
                    "2_bit_lsb": cap2,
                }
            }
            print(json.dumps(result, indent=2))

        elif args.command == "hide":
            res = encode_secret_file(
                cover_image_path=args.cover,
                secret_file_path=args.secret,
                output_image_path=args.output,
                password=args.password,
                bits_per_channel=args.bits,
                compress=not args.no_compress,
                deniability_mode=args.deniability,
                decoy_file_path=args.decoy if args.deniability else None,
                decoy_password=args.decoy_password if args.deniability else ""
            )
            print(json.dumps(res, indent=2))

        elif args.command == "extract":
            res = decode_secret_file(
                stego_image_path=args.stego,
                output_dir=args.output_dir,
                password=args.password,
                force_layer=args.layer
            )
            print(json.dumps(res, indent=2))

        elif args.command == "diff":
            res = generate_diff_image(
                cover_path=args.cover,
                stego_path=args.stego,
                output_path=args.output,
                amplify=args.amplify
            )
            print(json.dumps(res, indent=2))

    except Exception as e:
        err_out = {
            "success": False,
            "error": str(e)
        }
        print(json.dumps(err_out), file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()
