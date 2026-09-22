import AppKit

let width: CGFloat = 640
let height: CGFloat = 380
// Finder measures icon positions from the top of the window.
let iconCenterFromTop: CGFloat = 278
let leftIconX: CGFloat = 160
let rightIconX: CGFloat = 480

func yFromTop(_ top: CGFloat) -> CGFloat {
    height - top
}

func color(_ hex: Int, alpha: CGFloat = 1) -> NSColor {
    NSColor(
        red: CGFloat((hex >> 16) & 0xFF) / 255,
        green: CGFloat((hex >> 8) & 0xFF) / 255,
        blue: CGFloat(hex & 0xFF) / 255,
        alpha: alpha
    )
}

func drawArrow(in ctx: CGContext, midY: CGFloat) {
    let start = CGPoint(x: leftIconX + 58, y: midY)
    let end = CGPoint(x: rightIconX - 70, y: midY)
    ctx.saveGState()
    ctx.setStrokeColor(color(0x8A8A8E).cgColor)
    ctx.setLineWidth(1.5)
    ctx.setLineDash(phase: 0, lengths: [5, 4])
    ctx.move(to: start)
    ctx.addLine(to: CGPoint(x: end.x - 10, y: end.y))
    ctx.strokePath()
    ctx.restoreGState()

    ctx.saveGState()
    ctx.setFillColor(color(0x8A8A8E).cgColor)
    let tip = end
    ctx.move(to: tip)
    ctx.addLine(to: CGPoint(x: tip.x - 14, y: tip.y + 8))
    ctx.addLine(to: CGPoint(x: tip.x - 14, y: tip.y - 8))
    ctx.closePath()
    ctx.fillPath()
    ctx.restoreGState()
}

func draw(scale: CGFloat) -> Data {
    let pixelW = Int(width * scale)
    let pixelH = Int(height * scale)
    guard let rep = NSBitmapImageRep(
        bitmapDataPlanes: nil,
        pixelsWide: pixelW,
        pixelsHigh: pixelH,
        bitsPerSample: 8,
        samplesPerPixel: 4,
        hasAlpha: true,
        isPlanar: false,
        colorSpaceName: .deviceRGB,
        bytesPerRow: 0,
        bitsPerPixel: 0
    ) else {
        fatalError("Could not create bitmap")
    }
    rep.size = NSSize(width: width, height: height)
    NSGraphicsContext.saveGraphicsState()
    guard let ctx = NSGraphicsContext(bitmapImageRep: rep) else {
        fatalError("Could not create graphics context")
    }
    NSGraphicsContext.current = ctx
    let cg = ctx.cgContext

    color(0xEDECEC).setFill()
    NSRect(x: 0, y: 0, width: width, height: height).fill()

    let title = "Install QuizApp"
    let titleFont = NSFont.systemFont(ofSize: 22, weight: .semibold)
    let titleAttrs: [NSAttributedString.Key: Any] = [
        .font: titleFont,
        .foregroundColor: color(0x1C1C1E),
    ]
    let titleSize = (title as NSString).size(withAttributes: titleAttrs)
    (title as NSString).draw(
        at: NSPoint(x: 48, y: yFromTop(24 + titleSize.height)),
        withAttributes: titleAttrs
    )

    let body = "Drag QuizApp into the Applications folder. macOS will say the app is damaged because it's not signed by a developer (I'm cheap). Open Terminal and run:"
    let bodyStyle = NSMutableParagraphStyle()
    bodyStyle.lineSpacing = 2
    let bodyAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 13, weight: .regular),
        .foregroundColor: color(0x3A3A3C),
        .paragraphStyle: bodyStyle,
    ]
    let bodyRect = NSRect(x: 48, y: yFromTop(104), width: width - 96, height: 44)
    (body as NSString).draw(in: bodyRect, withAttributes: bodyAttrs)

    let command = "xattr -cr /Applications/QuizApp.app"
    let commandFont = NSFont.monospacedSystemFont(ofSize: 15, weight: .medium)
    let commandAttrs: [NSAttributedString.Key: Any] = [
        .font: commandFont,
        .foregroundColor: color(0x1C1C1E),
    ]
    let commandSize = (command as NSString).size(withAttributes: commandAttrs)
    let boxW = commandSize.width + 36
    let boxH: CGFloat = 40
    let boxX = (width - boxW) / 2
    let boxTop: CGFloat = 112
    let box = NSRect(x: boxX, y: yFromTop(boxTop + boxH), width: boxW, height: boxH)
    let path = NSBezierPath(roundedRect: box, xRadius: 8, yRadius: 8)
    color(0xFFFFFF).setFill()
    path.fill()
    color(0xD2D2D7).setStroke()
    path.lineWidth = 1
    path.stroke()
    (command as NSString).draw(
        at: NSPoint(
            x: boxX + 18,
            y: box.minY + (boxH - commandSize.height) / 2
        ),
        withAttributes: commandAttrs
    )

    let note = "That command clears the download warning for QuizApp only. Then open the app from Applications."
    let noteAttrs: [NSAttributedString.Key: Any] = [
        .font: NSFont.systemFont(ofSize: 12, weight: .regular),
        .foregroundColor: color(0x6E6E73),
    ]
    let noteRect = NSRect(x: 48, y: yFromTop(190), width: width - 96, height: 32)
    (note as NSString).draw(in: noteRect, withAttributes: noteAttrs)

    drawArrow(in: cg, midY: yFromTop(iconCenterFromTop))

    NSGraphicsContext.restoreGraphicsState()
    guard let png = rep.representation(using: .png, properties: [:]) else {
        fatalError("Could not encode PNG")
    }
    return png
}

let outDir = CommandLine.arguments.count > 1 ? CommandLine.arguments[1] : "build"
try FileManager.default.createDirectory(atPath: outDir, withIntermediateDirectories: true)
try draw(scale: 1).write(to: URL(fileURLWithPath: "\(outDir)/background.png"))
try draw(scale: 2).write(to: URL(fileURLWithPath: "\(outDir)/background@2x.png"))
print("wrote \(outDir)/background.png and background@2x.png")
