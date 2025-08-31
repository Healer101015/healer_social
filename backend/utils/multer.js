import multer from "multer";
import dotenv from "dotenv";

dotenv.config();

export const upload = multer({ 
    storage: multer.memoryStorage(),
    limits: { fileSize: 10 * 1024 * 1024 } 
});

export const handleUpload = async (req, res, next) => {
    // nada enviado
    if (!req.file && !req.files) return next();

    const processFile = async (file) => {
        let attachmentType;

        if (file.mimetype.startsWith("image/")) {
            attachmentType = "image";
        } else if (file.mimetype.startsWith("audio/")) {
            attachmentType = "audio";
        } else if (file.mimetype.startsWith("video/")) {
            attachmentType = "video";
        } else {
            return {
                ...file,
                attachmentType: "unsupported",
                fileUrl: "https://cdn.discordapp.com/attachments/1411263605415874590/1411518091908747395/image.png?ex=68b4f229&is=68b3a0a9&hm=b42ddf7296cffdf1ab23d179cf6e35ed30a43e1dadbd80518f7f87102e9ad2c5&"
            };
        }

        const fileBuffer = file.buffer;
        const imageBase64 = fileBuffer.toString("base64");

        try {
            const fetchResponse = await fetch(process.env.IMAGE_UPLOAD_URL, {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ imageBase64, contentType: file.mimetype })
            });

            if (!fetchResponse.ok) {
                return {
                    ...file,
                    attachmentType,
                    fileUrl: "https://cdn.discordapp.com/attachments/1411263605415874590/1411518439893241886/image.png?ex=68b4f27c&is=68b3a0fc&hm=a716a3b367eb3287ea319639d950b995b896f48266e69983bab79ad046fcb4a6&"
                };
            }

            const responseData = await fetchResponse.json();

            return {
                ...file,
                attachmentType,
                fileUrl: responseData.url
            };
        } catch (err) {
            console.error("Upload error:", err);
            return {
                ...file,
                attachmentType,
                fileUrl: "https://cdn.discordapp.com/attachments/1411263605415874590/1411518439893241886/image.png?ex=68b4f27c&is=68b3a0fc&hm=a716a3b367eb3287ea319639d950b995b896f48266e69983bab79ad046fcb4a6&"
            };
        }
    };

    if (req.file) {
        req.file = await processFile(req.file);
    }

    if (req.files) {
        if (Array.isArray(req.files)) {
            req.files = await Promise.all(req.files.map(processFile));
        } else {
            for (const field in req.files) {
                req.files[field] = await Promise.all(req.files[field].map(processFile));
            }
        }
    }

    next();
};

