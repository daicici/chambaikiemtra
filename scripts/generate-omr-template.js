import fs from "node:fs";
import path from "node:path";
import PdfPrinter from "pdfmake";

const outputPath = path.resolve("output/pdf/mau-phieu-trac-nghiem-2025-rut-gon.pdf");
const pink = "#d56b92";
const lightPink = "#fff1f6";
const dark = "#2a171b";
const groupBorderWidth = 1.25;

const printer = new PdfPrinter(getFonts());

const docDefinition = {
  pageSize: "A4",
  pageMargins: [28, 24, 28, 24],
  defaultStyle: {
    font: "Arial",
    fontSize: 9,
    color: dark,
    lineHeight: 1.1
  },
  content: [
    {
      table: {
        widths: ["*"],
        body: [
          [
            {
              stack: [
                {
                  text: "PHIẾU  TRẢ  LỜI  TRẮC  NGHIỆM",
                  alignment: "center",
                  bold: true,
                  fontSize: 16,
                  margin: [0, 4, 0, 9]
                },
                {
                  columns: [
                    infoBlock("Họ và tên", "............................................................"),
                    infoBlock("Môn thi", "........................................"),
                    infoBlock("Lớp", "...................."),
                    infoBlock("Mã đề", "........")
                  ],
                  columnGap: 9,
                  margin: [0, 0, 0, 10]
                },
                sectionLabel("PHẦN I"),
                {
                  columns: [
                    answerBlock(1, 10),
                    answerBlock(11, 20),
                    answerBlock(21, 30),
                    answerBlock(31, 40)
                  ],
                  columnGap: 12,
                  margin: [0, 2, 0, 13]
                },
                {
                  stack: [
                    sectionLabel("PHẦN II"),
                    {
                      columns: Array.from({ length: 4 }, (_, index) => trueFalsePair(index * 2 + 1)),
                      columnGap: 10,
                      margin: [0, 2, 0, 11]
                    },
                    sectionLabel("PHẦN III"),
                    {
                      columns: Array.from({ length: 6 }, (_, index) => numericQuestion(index + 1)),
                      columnGap: 8
                    }
                  ]
                },
                {
                  text: "Lưu ý: Tô kín một phương án trả lời cho mỗi câu. Không viết thêm thông tin ngoài các ô được thiết kế trên phiếu.",
                  margin: [0, 12, 0, 0],
                  fontSize: 8,
                  italics: true,
                  color: "#5b454b"
                }
              ],
              fillColor: lightPink,
              margin: [10, 9, 10, 10]
            }
          ]
        ]
      },
      layout: {
        hLineColor: () => pink,
        vLineColor: () => pink,
        hLineWidth: () => 1,
        vLineWidth: () => 1,
        paddingLeft: () => 0,
        paddingRight: () => 0,
        paddingTop: () => 0,
        paddingBottom: () => 0
      }
    }
  ]
};

fs.mkdirSync(path.dirname(outputPath), { recursive: true });

const pdf = printer.createPdfKitDocument(docDefinition);
const output = fs.createWriteStream(outputPath);
pdf.pipe(output);
pdf.end();

output.on("finish", () => {
  console.log(outputPath);
});

function infoBlock(label, placeholder) {
  return {
    width: "*",
    stack: [
      { text: label + ":", bold: true, fontSize: 8, color: "#4a2b31" },
      { text: placeholder, fontSize: 9, margin: [0, 2, 0, 0] }
    ]
  };
}

function sectionLabel(text) {
  return {
    columns: [
      {
        width: 10,
        canvas: [{ type: "rect", x: 0, y: 2, w: 7, h: 7, color: "#111111" }]
      },
      { text, bold: true, fontSize: 10, color: "#4a1f27", width: "*" }
    ],
    margin: [0, 0, 0, 4]
  };
}

function answerBlock(start, end) {
  const body = [
    [
      blankCell(),
      headerCell("A"),
      headerCell("B"),
      headerCell("C"),
      headerCell("D")
    ]
  ];

  for (let number = start; number <= end; number += 1) {
    body.push([
      numberCell(number),
      bubbleCell(),
      bubbleCell(),
      bubbleCell(),
      bubbleCell()
    ]);
  }

  return framedTable(["18%", "20.5%", "20.5%", "20.5%", "20.5%"], body);
}

function trueFalsePair(startNumber) {
  const endNumber = startNumber + 1;
  const body = [
    [
      blankCell(),
      { text: "Câu " + startNumber, colSpan: 2, bold: true, alignment: "center", fontSize: 8 },
      {},
      { text: "Câu " + endNumber, colSpan: 2, bold: true, alignment: "center", fontSize: 8 },
      {}
    ],
    [
      blankCell(),
      trueFalseHeaderCell("Đúng"),
      trueFalseHeaderCell("Sai"),
      trueFalseHeaderCell("Đúng"),
      trueFalseHeaderCell("Sai")
    ],
    [choiceLabelCell("a)"), bubbleCell(), bubbleCell(), bubbleCell(), bubbleCell()],
    [choiceLabelCell("b)"), bubbleCell(), bubbleCell(), bubbleCell(), bubbleCell()],
    [choiceLabelCell("c)"), bubbleCell(), bubbleCell(), bubbleCell(), bubbleCell()],
    [choiceLabelCell("d)"), bubbleCell(), bubbleCell(), bubbleCell(), bubbleCell()]
  ];

  return trueFalsePairTable(["18%", "20.5%", "20.5%", "20.5%", "20.5%"], body);
}

function numericQuestion(number) {
  const choices = ["0", "1", "2", "3", "4", "5", "6", "7", "8", "9"];
  const body = [
    [
      {
        text: "Câu " + number,
        colSpan: 2,
        bold: true,
        alignment: "center",
        fontSize: 8,
        margin: [0, 0, 0, 2]
      },
      {}
    ],
    ...choices.map((choice) => [
      numericChoiceCell(choice),
      bubbleCell()
    ])
  ];

  return {
    table: {
      widths: ["42%", "58%"],
      body
    },
    layout: {
      hLineColor: () => pink,
      vLineColor: () => pink,
      hLineWidth: (i) => (i === 0 || i === body.length ? groupBorderWidth : 0),
      vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? groupBorderWidth : 0),
      paddingLeft: () => 2,
      paddingRight: () => 2,
      paddingTop: () => 0,
      paddingBottom: () => 0
    }
  };
}

function framedTable(widths, body) {
  return {
    table: { widths, body },
    layout: {
      hLineColor: () => pink,
      vLineColor: () => pink,
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? groupBorderWidth : 0),
      vLineWidth: (i, node) => (i === 0 || i === node.table.widths.length ? groupBorderWidth : 0),
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 1,
      paddingBottom: () => 1
    }
  };
}

function trueFalsePairTable(widths, body) {
  return {
    table: { widths, body },
    layout: {
      hLineColor: () => pink,
      vLineColor: () => pink,
      hLineWidth: (i, node) => (i === 0 || i === node.table.body.length ? groupBorderWidth : 0),
      vLineWidth: (i, node) =>
        i === 0 || i === node.table.widths.length ? groupBorderWidth : i === 3 ? 1 : 0,
      paddingLeft: () => 3,
      paddingRight: () => 3,
      paddingTop: () => 1,
      paddingBottom: () => 1
    }
  };
}

function headerCell(text) {
  return {
    text,
    color: pink,
    bold: true,
    alignment: "center",
    fontSize: 8
  };
}

function trueFalseHeaderCell(text) {
  return {
    text,
    color: pink,
    bold: true,
    alignment: "center",
    fontSize: 6,
    noWrap: true
  };
}

function choiceLabelCell(text) {
  return {
    text,
    color: dark,
    bold: true,
    alignment: "center",
    fontSize: 7,
    noWrap: true
  };
}

function numberCell(number) {
  return {
    text: String(number),
    bold: true,
    alignment: "right",
    fontSize: 8
  };
}

function numericChoiceCell(text) {
  return {
    text,
    color: dark,
    bold: true,
    alignment: "center",
    fontSize: 9
  };
}

function bubbleCell() {
  return {
    text: "○",
    color: pink,
    alignment: "center",
    fontSize: 12
  };
}

function blankCell() {
  return {
    text: ""
  };
}

function getFonts() {
  const windowsFonts = path.join(process.env.WINDIR || "C:\\Windows", "Fonts");
  const candidates = [
    {
      normal: path.join(windowsFonts, "arial.ttf"),
      bold: path.join(windowsFonts, "arialbd.ttf"),
      italics: path.join(windowsFonts, "ariali.ttf"),
      bolditalics: path.join(windowsFonts, "arialbi.ttf")
    },
    {
      normal: "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
      bold: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Bold.ttf",
      italics: "/usr/share/fonts/truetype/dejavu/DejaVuSans-Oblique.ttf",
      bolditalics: "/usr/share/fonts/truetype/dejavu/DejaVuSans-BoldOblique.ttf"
    }
  ];

  const fontSet = candidates.find((candidate) =>
    Object.values(candidate).every((fontPath) => fs.existsSync(fontPath))
  );

  if (!fontSet) {
    throw new Error("Khong tim thay font Unicode de tao PDF.");
  }

  return { Arial: fontSet };
}
