"use client";

import type { ChangeEvent } from "react";

type Props = {
  disabled: boolean;
  file: File | null;
  onChange: (file: File | null) => void;
};

const ACCEPTED_TYPES = "image/jpeg,image/png,image/webp";

export function UploadScanFile({ disabled, file, onChange }: Props) {
  function handleChange(event: ChangeEvent<HTMLInputElement>) {
    onChange(event.target.files?.[0] ?? null);
  }

  return (
    <div className="upload-scan-card">
      <label className="field">
        Tải lên ảnh bài làm
        <input accept={ACCEPTED_TYPES} disabled={disabled} onChange={handleChange} type="file" />
      </label>
      <p>Hỗ trợ JPG, PNG hoặc WEBP. Nếu đã chọn file, nút Bắt đầu sẽ chấm file này thay vì quét camera.</p>
      {file ? (
        <div className="selected-file-row">
          <span>{file.name}</span>
          <button className="ghost-button" disabled={disabled} onClick={() => onChange(null)} type="button">
            Bỏ chọn
          </button>
        </div>
      ) : null}
    </div>
  );
}
