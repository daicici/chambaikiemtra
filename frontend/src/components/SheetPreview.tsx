export function SheetPreview() {
  return (
    <div className="sheet-preview" aria-label="Mẫu phiếu trả lời">
      <div className="sheet-preview-title">PHIẾU TRẢ LỜI TRẮC NGHIỆM</div>
      <div className="bubble-blocks">
        {[1, 11, 21, 31].map((start) => (
          <div className="bubble-block" key={start}>
            <div className="bubble-header">
              <span />
              <span>A</span>
              <span>B</span>
              <span>C</span>
              <span>D</span>
            </div>
            {Array.from({ length: 10 }, (_, index) => start + index).map((number) => (
              <div className="bubble-row" key={number}>
                <strong>{number}</strong>
                <span />
                <span />
                <span />
                <span />
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
