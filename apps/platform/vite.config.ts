import { defineConfig } from "vite"
import { devtools } from "@tanstack/devtools-vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"

// Silencia los errores "ECONNRESET"/"aborted" del servidor de desarrollo.
// Ocurren cuando el navegador corta una conexión HTTP a medias (al recargar o
// navegar) y son inofensivos. Esto solo evita que ensucien la consola; no
// cambia el comportamiento de la app.
function isAbortedConnectionError(err: unknown): boolean {
  if (!err || typeof err !== "object") return false
  const code = "code" in err ? (err as { code?: string }).code : undefined
  const message =
    "message" in err ? String((err as { message?: unknown }).message) : ""
  return (
    code === "ECONNRESET" ||
    code === "ECONNABORTED" ||
    code === "EPIPE" ||
    message === "aborted"
  )
}

// Decide si un texto corresponde al ruido de una conexión abortada.
function isAbortedConnectionText(text: string): boolean {
  return (
    text.includes("ECONNRESET") ||
    text.includes("abortIncoming") ||
    (text.includes("Error: aborted") && text.includes("socketOnClose"))
  )
}

// Filtra la salida de consola para descartar el ruido de conexiones abortadas.
// Node imprime estos errores directamente en stderr/console, así que la forma
// más fiable de silenciarlos es interceptar la escritura y descartarla cuando
// corresponde a ese ruido inofensivo. No afecta a ningún otro mensaje.
function installConsoleFilter() {
  const anyGlobal = globalThis as { __abortedFilterInstalled?: boolean }
  if (anyGlobal.__abortedFilterInstalled) return
  anyGlobal.__abortedFilterInstalled = true

  const originalStderrWrite = process.stderr.write.bind(process.stderr)
  // @ts-expect-error sobrescritura compatible en runtime
  process.stderr.write = (chunk: unknown, ...rest: unknown[]) => {
    const text = typeof chunk === "string" ? chunk : String(chunk)
    if (isAbortedConnectionText(text)) return true
    // @ts-expect-error reenvío de argumentos original
    return originalStderrWrite(chunk, ...rest)
  }

  const originalConsoleError = console.error.bind(console)
  console.error = (...args: unknown[]) => {
    const text = args.map((a) => String(a)).join(" ")
    if (isAbortedConnectionText(text)) return
    originalConsoleError(...args)
  }

  process.on("uncaughtException", (err) => {
    if (isAbortedConnectionError(err)) return
    throw err
  })
}

installConsoleFilter()

// Plugin que, además del filtro de consola, descarta el error a nivel de socket.
function silenceAbortedConnectionsPlugin() {
  return {
    name: "silence-aborted-connections",
    configureServer(server: {
      httpServer: {
        on: (event: string, cb: (...args: unknown[]) => void) => void
      } | null
    }) {
      const httpServer = server.httpServer
      if (!httpServer) return
      httpServer.on("clientError", (err: unknown, socket: unknown) => {
        if (isAbortedConnectionError(err)) {
          const s = socket as { destroy?: () => void } | undefined
          s?.destroy?.()
        }
      })
    },
  }
}

const config = defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    silenceAbortedConnectionsPlugin(),
    devtools(),
    tailwindcss(),
    tanstackStart(),
    viteReact(),
  ],

  // Acelera el arranque: pre-empaqueta las dependencias pesadas una sola vez
  // y "calienta" los archivos que se usan al cargar la app.
  optimizeDeps: {
    include: [
      "react",
      "react-dom",
      "react-dom/client",
      "recharts",
      "@hugeicons/react",
      "@hugeicons/core-free-icons",
    ],
  },
  server: {
    warmup: {
      clientFiles: [
        "./src/router.tsx",
        "./src/routes/__root.tsx",
        "./src/routes/dashboard.tsx",
        "./src/routes/conversaciones.tsx",
      ],
    },
  },
})

export default config
