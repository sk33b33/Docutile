import { PDFDocument } from "pdf-lib";

export async function pdfBuffer(pages: number): Promise<Buffer> {
  const d = await PDFDocument.create();
  for (let i = 0; i < pages; i++) d.addPage([200, 200]);
  return Buffer.from(await d.save());
}

export const fakePdf = { name: "fake.pdf", mimeType: "application/pdf", buffer: Buffer.from("just text") };
// Valid ZIP signature, so it passes the docx content check.
export const docx = { name: "doc.docx", mimeType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document", buffer: Buffer.from([0x50, 0x4b, 3, 4, 0, 0, 0, 0]) };

export async function pdfFile(name: string, pages: number) {
  return { name, mimeType: "application/pdf", buffer: await pdfBuffer(pages) };
}
