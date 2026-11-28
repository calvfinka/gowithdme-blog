#!/usr/bin/env python3
"""Server lokal yang meniru GitHub Pages: URL bersih (/arsip -> arsip.html, /berita/x -> berita/x.html),
index folder, dan 404.html dengan status 404. Pakai: python3 tools/serve.py [port]"""
import http.server, os, socketserver, sys, functools
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 8000

class H(http.server.SimpleHTTPRequestHandler):
    def translate_path(self, path):
        p = super().translate_path(path)
        if not os.path.exists(p) and os.path.isfile(p + ".html"):
            return p + ".html"
        return p
    def send_error(self, code, message=None, explain=None):
        page = os.path.join(ROOT, "404.html")
        if code == 404 and os.path.isfile(page):
            d = open(page, "rb").read()
            self.send_response(404)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(d)))
            self.end_headers()
            if self.command != "HEAD":
                self.wfile.write(d)
        else:
            super().send_error(code, message, explain)
    def end_headers(self):
        self.send_header("Cache-Control", "no-cache")
        super().end_headers()

socketserver.TCPServer.allow_reuse_address = True
with socketserver.ThreadingTCPServer(("0.0.0.0", PORT), functools.partial(H, directory=ROOT)) as s:
    print(f"Blog GoWithDME lokal: http://localhost:{PORT}/  (Ctrl+C untuk berhenti)")
    try: s.serve_forever()
    except KeyboardInterrupt: pass
