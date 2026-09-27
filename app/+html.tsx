import { ScrollViewStyleReset } from "expo-router/html";
import type { PropsWithChildren } from "react";

/** Page HTML de la version web. « only light » empêche Chrome et Samsung Internet d'assombrir l'app de force. */
export default function Root({ children }: PropsWithChildren) {
  return (
    <html lang="fr">
      <head>
        <meta charSet="utf-8" />
        <meta httpEquiv="X-UA-Compatible" content="IE=edge" />
        <meta name="viewport" content="width=device-width, initial-scale=1, shrink-to-fit=no" />
        <meta name="color-scheme" content="only light" />
        <meta name="theme-color" content="#F2EFE6" />
        <ScrollViewStyleReset />
        <style dangerouslySetInnerHTML={{ __html: "html, body { background-color: #F2EFE6; color-scheme: only light; }" }} />
      </head>
      <body>{children}</body>
    </html>
  );
}
