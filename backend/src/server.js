import dotenv from "dotenv";
dotenv.config();

import app from "./app.js";
import { supabase } from "./db/index.js";

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});