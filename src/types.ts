export interface SampleCover {
  id: string;
  name: string;
  url: string;
  type: string;
  capacity: string;
}

export interface SampleSecret {
  id: string;
  name: string;
  category: 'text' | 'document' | 'image' | 'other';
  label: string;
  url: string;
}

export interface CoverInfo {
  width: number;
  height: number;
  format: string;
  file_size: number;
  dimensions?: string;
  pixels?: number;
  capacities?: {
    '1_bit_lsb': {
      usable_capacity_bytes: number;
      formatted_usable: string;
    };
    '2_bit_lsb': {
      usable_capacity_bytes: number;
      formatted_usable: string;
    };
  };
}

export interface StegoResult {
  success: boolean;
  deniability_mode?: boolean;
  output_path: string;
  downloadUrl: string;
  diffUrl?: string | null;
  outputFilename: string;
  cover_info: {
    width: number;
    height: number;
    format: string;
    file_size: number;
  };
  stego_info: {
    file_size: number;
    format: string;
    psnr_db: number | string;
    mse: number;
    pixels_altered: number;
    pixels_altered_pct: number;
  };
  secret_info: {
    filename: string;
    original_size: number;
    formatted_size: string;
    stored_payload_size: number;
    compressed: boolean;
    encrypted: boolean;
    capacity_used_pct?: number;
  };
  decoy_info?: {
    filename: string;
    original_size: number;
    formatted_size: string;
    stored_payload_size: number;
    compressed: boolean;
    encrypted: boolean;
  };
}

export interface ExtractResult {
  success: boolean;
  deniability_mode?: boolean;
  active_layer?: string;
  filename?: string;
  extracted_path?: string;
  downloadUrl?: string;
  size_bytes?: number;
  formatted_size?: string;
  crc_verified?: boolean;
  crc32_hex?: string;
  category?: 'text' | 'document' | 'image' | 'other';
  is_compressed?: boolean;
  is_encrypted?: boolean;
  password_required?: boolean;
  textPreview?: string | null;
  error?: string;
}
