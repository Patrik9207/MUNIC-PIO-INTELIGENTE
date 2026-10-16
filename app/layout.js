import "./globals.css";

export const metadata = {
  title: "Município Inteligente",
  description: "Aplicação de análise contábil e financeira municipal",
};

export default function RootLayout({ children }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
