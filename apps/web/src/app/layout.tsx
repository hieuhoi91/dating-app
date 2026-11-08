import type { Metadata, Viewport } from "next";
import "@fontsource/be-vietnam-pro/400.css";
import "@fontsource/be-vietnam-pro/500.css";
import "@fontsource/be-vietnam-pro/600.css";
import "@fontsource/be-vietnam-pro/700.css";
import "@fontsource/lora/400.css";
import "@fontsource/lora/400-italic.css";
import "./globals.css";

export const metadata: Metadata = {
  title: "DATING — Một chút gần hơn, mỗi ngày",
  description: "Gặp gỡ những người khiến bạn muốn lắng nghe thêm một chút.",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="vi"
      data-scroll-behavior="smooth"
      suppressHydrationWarning
    >
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try {
              const theme = localStorage.getItem("dating-season-theme");
              if (theme === "spring" || theme === "summer" || theme === "autumn" || theme === "winter") {
                document.documentElement.dataset.season = theme;
              }
            } catch (error) {
              console.error("Could not load the saved seasonal theme before rendering.", error);
            }`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
