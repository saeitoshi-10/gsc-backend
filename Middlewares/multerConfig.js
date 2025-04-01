import multer, { diskStorage } from "multer";
import fs from "fs";

if (!fs.existsSync('uploads')) {
  fs.mkdirSync('uploads');
}
const storage = diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const upload = multer({ storage });

export default upload;
