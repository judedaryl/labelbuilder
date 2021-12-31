import express from 'express';
import PDF from 'pdfkit';
import Jimp from 'jimp';
import path from 'path';
import memorystream from 'memorystream';
const app = express();
const port = 3000;

async function buildFromTemplate(label: string, weight: string, barcode: string) {
    const template = path.join(__dirname, '../assets/template.png')
    const imgFile = await Jimp.read(template);
    let font = await Jimp.loadFont(Jimp.FONT_SANS_64_BLACK);
    let textWidth = Jimp.measureText(font, label);
    if (textWidth > 276) {
        font = await Jimp.loadFont(Jimp.FONT_SANS_32_BLACK);
        textWidth = Jimp.measureText(font, label);
    }
    const textHeight = Jimp.measureTextHeight(font, label, 500);
    const width = imgFile.getWidth();
    const height = imgFile.getHeight();

    imgFile.print(font, (width / 2) - (textWidth / 2), (height / 2) - (textHeight / 2) + 25, label, 375, 188);

    const weightFont = await Jimp.loadFont(Jimp.FONT_SANS_32_WHITE);
    const weightWidth = Jimp.measureText(weightFont, weight);
    imgFile.print(weightFont, 85 - (weightWidth / 2), 195, weight, 375, 188)
    imgFile.scale(0.65);

    const barcodeFontPath = path.join(__dirname, '../assets/Barcode.fnt');
    const barcodeFont = await Jimp.loadFont(barcodeFontPath);

    imgFile.print(barcodeFont, 300, 140, barcode);

    const imgBuffer = await imgFile.getBufferAsync(Jimp.MIME_PNG);
    return {
        buffer: imgBuffer,
        width: imgFile.getWidth(),
        height: imgFile.getHeight()
    };
}

app.get('/', async (req, res) => {
    const label = (req.query.label as string) || 'default';
    let weight = (req.query.weight as string) || '0'
    const barcode = (req.query.barcode as string) || '123456'
    weight = weight + 'g';
    const imgBuffer = await buildFromTemplate(label, weight, barcode);

    const stream = new memorystream();
    const doc = new PDF({
        size: [816, 1344]
    });


    let buffers: Uint8Array[] = [];
    doc.on('data', buffers.push.bind(buffers));
    doc.on('end', () => {
        let pdfData = Buffer.concat(buffers);

        res.setHeader('content-type', 'application/pdf');
        res.send(pdfData);
    })

    for (let i = 0; i <= 6; i++) {
        for (let j = 0; j <= 1; j++) {
            doc.image(imgBuffer.buffer, j * imgBuffer.width + 15, i * imgBuffer.height + 50);
        }
    }


    // doc.text('asd', 0, 0)
    doc.end();



    // res.pipe(stream);

    // res.setHeader('content-type', 'application/pdf');
    // res.send(imgBuffer)
    //    res.setH
})

app.listen(port, () => {
    console.log(`Example app listening at http://localhost:${port}`)
})