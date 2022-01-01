import express from 'express';
import PDF from 'pdfkit';
import cors from 'cors';
import Jimp from 'jimp';
import path from 'path';
import memorystream from 'memorystream';
const app = express();
const port = 3000;

app.use(cors({
    origin: '*',
    methods: '*'
}))

async function buildFromTemplate(label: string, weight: string, barcode: string) {
    const template = path.join(__dirname, '../assets/template.png')
    const imgFile = await Jimp.read(template);
    imgFile.scale(0.7);
    const width = imgFile.getWidth();
    const height = imgFile.getHeight();


    const titleFontPath = path.join(__dirname, '../assets/TitleFont.fnt');
    const titleFont = await Jimp.loadFont(titleFontPath);
    const title = 'Dried Fish';
    const titleWidth = Jimp.measureText(titleFont, title);
    imgFile.print(titleFont, (width / 2) - (titleWidth / 2), 80, title);

    let labelFontPath = path.join(__dirname, '../assets/LabelFont_48.fnt');
    let font = await Jimp.loadFont(labelFontPath);
    let textWidth = Jimp.measureText(font, label);

    if (textWidth > 212) {
        labelFontPath = path.join(__dirname, '../assets/LabelFont_32.fnt');
        font = await Jimp.loadFont(labelFontPath);
        textWidth = Jimp.measureText(font, label);
    }

    const textHeight = Jimp.measureTextHeight(font, label, 500);

    imgFile.print(font, (width / 2) - (textWidth / 2), (height / 2) - (textHeight / 2) + 40, label, 375, 188);

    const weightFontPath = path.join(__dirname, '../assets/WeightFont.fnt');
    const weightFont = await Jimp.loadFont(weightFontPath);
    const weightWidth = Jimp.measureText(weightFont, weight);
    imgFile.print(weightFont, 62 - (weightWidth / 2), 132, weight, 375, 188)


    const barcodeFontPath = path.join(__dirname, '../assets/Barcode_64.fnt');
    const barcodeFont = await Jimp.loadFont(barcodeFontPath);
    const barcodeWidth = Jimp.measureText(barcodeFont, barcode);
    const barcodeHeight = Jimp.measureTextHeight(barcodeFont, barcode, 500);


    imgFile.print(barcodeFont, width - barcodeWidth - 5, height - barcodeHeight - 5, barcode);


    const imgBuffer = await imgFile.getBufferAsync(Jimp.MIME_PNG);
    return {
        buffer: imgBuffer,
        width: imgFile.getWidth(),
        height: imgFile.getHeight()
    };
}

const buildDocument = (imgBuffer: { buffer: Buffer, width: number, height: number }) =>
    new Promise<Buffer>((res, rej) => {
        const doc = new PDF({
            size: [816, 1344]
        });
        let buffers: Uint8Array[] = [];
        doc.on('data', buffers.push.bind(buffers));
        doc.on('end', () => {
            let pdfData = Buffer.concat(buffers);
            res(pdfData);
        })
        const marginLeft = (816 - (imgBuffer.width * 2)) / 2;
        const marginTop = (1344 - (imgBuffer.height * 6)) / 2;

        for (let i = 0; i <= 5; i++) {
            for (let j = 0; j <= 1; j++) {
                doc.image(imgBuffer.buffer, (j * imgBuffer.width) + marginLeft, (i * imgBuffer.height) + marginTop);
            }
        }
        doc.end();
    });



const extractBarcodeParameters = (obj: any) => {
    const label = (obj.label as string) || 'default';
    let weight = (obj.weight as string) || '0'
    const barcode = (obj.barcode as string) || '123456'
    weight = weight + 'g';
    return { label, weight, barcode }
}

app.get('/preview', async (req, res) => {
    const params = extractBarcodeParameters(req.query);
    const img = await buildFromTemplate(params.label, params.weight, params.barcode);
    res.setHeader('content-type', 'image/png');
    res.send(img.buffer);
})

app.get('/render', async (req, res) => {
    const { label, weight, barcode } = extractBarcodeParameters(req.query);
    const imgBuffer = await buildFromTemplate(label, weight, barcode);
    const pdf = await buildDocument(imgBuffer);
    res.setHeader('content-type', 'application/pdf');
    res.send(pdf);
})

app.listen(port, () => {
    console.log(`Label Service listening at http://localhost:${port}`)
})