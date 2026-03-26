const axios = require('axios');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const path = require('path');

const GIPHY_KEY = process.env.GIPHY_KEY;
// adjust path to root of proj
const tempDir = path.join(__dirname, '..', 'temp');

if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
}

async function createTextGif(gifType, textOverlay) {
    // fetch from gify
    const searchResponse = await axios.get('https://api.giphy.com/v1/gifs/search', {
        params: { api_key: GIPHY_KEY, q: gifType, rating: 'pg-13', limit: 50 },
    });

    const gifs = searchResponse.data.data;
    if (!gifs || gifs.length === 0) throw new Error('No GIF found for that search term.');

    const randomGif = gifs[Math.floor(Math.random() * gifs.length)];
    const gifUrl = randomGif.images.original.url;
    if (!gifUrl) throw new Error('Could not extract GIF URL.');

    // download gif
    const timestamp = Date.now();
    const inputGif = path.join(tempDir, `input_${timestamp}.gif`);
    const outputGif = path.join(tempDir, `output_${timestamp}.gif`);

    const gifResponse = await axios.get(gifUrl, { responseType: 'stream' });
    const writer = fs.createWriteStream(inputGif);
    gifResponse.data.pipe(writer);

    await new Promise((resolve, reject) => {
        writer.on('finish', resolve);
        writer.on('error', reject);
    });

    // getting dimensions
    const metadata = await new Promise((resolve, reject) => {
        ffmpeg.ffprobe(inputGif, (err, data) => {
            if (err) return reject(new Error(`ffprobe error: ${err.message}`));
            resolve(data);
        });
    });

    const videoStream = metadata.streams.find(s => s.codec_type === 'video');
    if (!videoStream || !videoStream.width) throw new Error('Could not read GIF dimensions');

    const gifWidth = videoStream.width;
    let calculatedFontsize = (gifWidth / textOverlay.length) * 1.5;
    const finalFontsize = Math.floor(Math.max(18, Math.min(calculatedFontsize, 80)));

    // ffmpeg to process
    await new Promise((resolve, reject) => {
        const safeText = textOverlay.replace(/'/g, "\\'");
        const fontfilePath = '/System/Library/Fonts/HelveticaNeue.ttc';

        const filterString =
            `[0:v]split[original][blur];` +
            `[blur]crop=iw:${finalFontsize + 30}:0:ih-${finalFontsize + 40},boxblur=5:1[blurred];` +
            `[original][blurred]overlay=0:H-${finalFontsize + 40}[v1];` +
            `[v1]drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=black:fontsize=${finalFontsize}:x=(w-text_w)/2-2:y=h-th-22,` +
            `drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=black:fontsize=${finalFontsize}:x=(w-text_w)/2+2:y=h-th-22,` +
            `drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=black:fontsize=${finalFontsize}:x=(w-text_w)/2:y=h-th-24,` +
            `drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=black:fontsize=${finalFontsize}:x=(w-text_w)/2:y=h-th-20,` +
            `drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=black:fontsize=${finalFontsize}:x=(w-text_w)/2-2:y=h-th-20,` +
            `drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=black:fontsize=${finalFontsize}:x=(w-text_w)/2+2:y=h-th-20,` +
            `drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=black:fontsize=${finalFontsize}:x=(w-text_w)/2-2:y=h-th-24,` +
            `drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=black:fontsize=${finalFontsize}:x=(w-text_w)/2+2:y=h-th-24,` +
            `drawtext=text='${safeText}':fontfile=${fontfilePath}:fontcolor=white:fontsize=${finalFontsize}:x=(w-text_w)/2:y=h-th-22`;

        ffmpeg(inputGif)
            .outputOptions(['-vf', filterString, '-c:v', 'gif'])
            .output(outputGif)
            .on('end', resolve)
            .on('error', (err) => reject(new Error(`ffmpeg processing error: ${err.message}`)))
            .run();
    });

    // celanup file
    fs.unlinkSync(inputGif);
    return outputGif;
}

module.exports = { createTextGif };