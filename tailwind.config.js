/** @type {import('tailwindcss').Config} */
export default {
  // Chỉ quét source thật. KHÔNG quét public/labelling/** — đó là bundle build
  // sẵn của module khác, quét vào chỉ làm CSS phình thêm vô ích.
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {},
  },
  plugins: [],
};
