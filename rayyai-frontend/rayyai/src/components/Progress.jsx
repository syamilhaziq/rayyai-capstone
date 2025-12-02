const Progress = ({ value = 0, colorClass = "", styleColor = "" , className = "" }) => {
  const fillStyle = styleColor ? { width: `${Math.min(100, Math.max(0, value))}%`, backgroundColor: styleColor } : { width: `${Math.min(100, Math.max(0, value))}%` };
  return (
    <div className={"w-full h-2 rounded-full bg-gray-100 " + className}>
      <div className={"h-2 rounded-full transition-all " + colorClass} style={fillStyle} />
    </div>
  )
}

export default Progress;