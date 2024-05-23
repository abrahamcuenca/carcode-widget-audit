const fs = require('fs');
const path = require('path');
const { PNG } = require('pngjs');
const pixelmatch = require('pixelmatch');
const sharp = require('sharp');

const directoryPath = './';

function getFilesForComparison() {
    const filenames = fs.readdirSync(directoryPath);
    const dateMap = {};

    filenames.forEach((filename) => {
        const match = filename.match(/^(\d+)_([\d-]+)\.png$/);
        if (match) {
            const id = match[1];
            const date = match[2];
            if (!dateMap[id]) {
                dateMap[id] = [];
            }
            dateMap[id].push({ filename, date });
        }
    });

    const result = {};
    Object.keys(dateMap).forEach((id) => {
        const filesWithDates = dateMap[id];
        const sortedFiles = filesWithDates.sort((a, b) => new Date(b.date) - new Date(a.date));
        const lastTwoFiles = sortedFiles.slice(0, 2).map(file => file.filename);
        result[id] = lastTwoFiles;
    });

    return result
}

async function compareImages(dealerId, current, previous) {
    try {
        const img1 = sharp(current);
        const img2 = sharp(previous);

        const [img1Meta, img2Meta] = await Promise.all([img1.metadata(), img2.metadata()]);

        const targetWidth = Math.max(img1Meta.width, img2Meta.width);
        const targetHeight = Math.max(img1Meta.height, img2Meta.height);

        const [resizedImg1, resizedImg2] = await Promise.all([
            img1.resize(targetWidth, targetHeight, { fit: 'contain', background: 'white' }).toBuffer(),
            img2.resize(targetWidth, targetHeight, { fit: 'contain', background: 'white' }).toBuffer(),
        ]);

        const decodedImg1 = PNG.sync.read(resizedImg1);
        const decodedImg2 = PNG.sync.read(resizedImg2);

        const diff = new PNG({ width: targetWidth, height: targetHeight });

        const numDiffPixels = pixelmatch(
            decodedImg1.data,
            decodedImg2.data,
            diff.data,
            targetWidth,
            targetHeight,
            { threshold: 0.1 }
        );

        fs.writeFileSync(`${dealerId}__${current}--${previous}.png`, PNG.sync.write(diff));

        console.log(`Number of different pixels: ${numDiffPixels}`);
    } catch (error) {
        console.error('Error comparing images:', error);
    }
}

const files = getFilesForComparison();
Object.keys(files).forEach((dealerId) => {
    const [current, previous] = files[dealerId];
    compareImages(dealerId, current, previous);
});