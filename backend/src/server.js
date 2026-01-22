import app from "./app.js";
import dotenv from "dotenv";
import { supabase } from "./db/index.js";

dotenv.config();

const PORT = process.env.PORT || 4000;

app.listen(PORT, () => {
  console.log(`Backend running on port ${PORT}`);
});