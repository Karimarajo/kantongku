import React, { useState } from 'react';
import { Maximize2, X } from 'lucide-react';

interface QrisImageProps {
  src: string | undefined;
  boxClassName?: string; // sizing for the inline (non-fullscreen) box
  imgClassName?: string;
}

// Static QRIS payment code, shown inline with a "Lihat Layar Penuh" button
// (and the image itself is also tappable) that opens it as a genuinely
// full-screen overlay — added after live production testing showed even a
// generously-sized inline QR (up to ~340px) can still be too small/low-
// contrast for some phone cameras to focus on and scan reliably inside a
// cramped modal. Full-screen removes any container-size ceiling entirely:
// the QR renders at up to 92% of the actual viewport, whichever device.
export default function QrisImage({ src, boxClassName = 'max-w-[320px]', imgClassName = '' }: QrisImageProps) {
  const [fullscreen, setFullscreen] = useState(false);

  if (!src) return null;

  return (
    <>
      <div className="w-full flex flex-col items-center gap-2">
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className={`bg-white rounded-2xl p-4 w-full ${boxClassName} cursor-zoom-in`}
          title="Lihat QRIS layar penuh"
        >
          <img src={src} alt="Kode QRIS pembayaran" className={`w-full h-auto object-contain ${imgClassName}`} />
        </button>
        <button
          type="button"
          onClick={() => setFullscreen(true)}
          className="flex items-center gap-1.5 text-xs font-semibold text-primary hover:underline"
        >
          <Maximize2 className="w-3.5 h-3.5" /> Lihat QRIS Layar Penuh
        </button>
      </div>

      {fullscreen && (
        // z-[200] — deliberately above every other overlay in this app
        // (highest existing is CategoryManagerModal's z-[70]), since this
        // can be opened from on top of an already-open payment modal.
        <div
          className="fixed inset-0 z-[200] bg-black flex flex-col items-center justify-center p-4 gap-4"
          onClick={() => setFullscreen(false)}
        >
          <button
            type="button"
            onClick={() => setFullscreen(false)}
            className="absolute top-4 right-4 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
          <div className="bg-white rounded-2xl p-4 w-full max-w-[92vw] max-h-[80vh] flex items-center justify-center">
            <img
              src={src}
              alt="Kode QRIS pembayaran (layar penuh)"
              className="w-full h-full object-contain"
              style={{ maxWidth: 'min(92vw, 92vh)', maxHeight: 'min(92vw, 92vh)' }}
              onClick={(e) => e.stopPropagation()}
            />
          </div>
          <p className="text-white/70 text-xs text-center">Tap di mana saja untuk menutup</p>
        </div>
      )}
    </>
  );
}
