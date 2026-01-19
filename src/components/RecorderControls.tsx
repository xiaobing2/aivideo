interface RecorderControlsProps {
  isRecording: boolean
  isInitializing: boolean
  onStart: () => void
  onStop: () => void
}

export default function RecorderControls({
  isRecording,
  isInitializing,
  onStart,
  onStop
}: RecorderControlsProps) {
  return (
    <div
      className="glass p-5 flex items-center justify-center gap-4 border-t border-cyan-400/30 relative"
      style={{
        pointerEvents: 'auto',
        zIndex: 50
      }}
    >
      {!isRecording ? (
        <button
          type="button"
          onClick={onStart}
          onPointerUp={onStart}
          disabled={isInitializing}
          className="tech-button control-button hover-lift disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ minWidth: 140 }}
        >
          🔴 {isInitializing ? '初始化中...' : '开始录制'}
        </button>
      ) : (
        <>
          <button
            type="button"
            onClick={onStop}
            onPointerUp={onStop}
            className="tech-button control-button hover-lift"
            style={{ minWidth: 140 }}
          >
            ⏹️ 停止录制
          </button>
        </>
      )}
    </div>
  )
}

