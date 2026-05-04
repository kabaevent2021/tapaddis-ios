import AVFoundation
import SwiftUI

struct VehicleQrScannerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let onToken: (String) -> Void
    @State private var message: String?

    var body: some View {
        ZStack {
            QRCodeScannerView { value in
                guard let token = extractVehicleQrToken(value) else {
                    message = "This QR code is not a TapAddis vehicle QR."
                    return
                }
                onToken(token)
            }
            .ignoresSafeArea()

            VStack {
                HStack {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 20, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 44, height: 44)
                            .background(Color.black.opacity(0.32))
                            .clipShape(Circle())
                    }
                    Spacer()
                }
                .padding(.horizontal, 18)
                .padding(.top, 18)

                Spacer()

                RoundedRectangle(cornerRadius: 28, style: .continuous)
                    .stroke(Color.white, lineWidth: 3)
                    .frame(width: 240, height: 240)
                    .shadow(radius: 12)

                Spacer()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Scan vehicle QR")
                        .font(.system(size: 20, weight: .black))
                    Text("Use the vehicle QR or enter the 6-digit code on Wallet.")
                        .font(.system(size: 13))
                        .foregroundStyle(TapAddisTheme.secondary)
                    if let message {
                        Text(message)
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(TapAddisTheme.danger)
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .padding(20)
                .background(.white)
                .clipShape(RoundedRectangle(cornerRadius: 24, style: .continuous))
                .padding(16)
            }
        }
    }
}

struct QRCodeScannerView: UIViewControllerRepresentable {
    let onCode: (String) -> Void

    func makeUIViewController(context: Context) -> ScannerViewController {
        let controller = ScannerViewController()
        controller.onCode = onCode
        return controller
    }

    func updateUIViewController(_ uiViewController: ScannerViewController, context: Context) {}
}

final class ScannerViewController: UIViewController, AVCaptureMetadataOutputObjectsDelegate {
    var onCode: ((String) -> Void)?
    private let session = AVCaptureSession()
    private var previewLayer: AVCaptureVideoPreviewLayer?
    private var didReadCode = false

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = .black
        configure()
    }

    override func viewDidLayoutSubviews() {
        super.viewDidLayoutSubviews()
        previewLayer?.frame = view.bounds
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        didReadCode = false
        if !session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async { [session] in
                session.startRunning()
            }
        }
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        if session.isRunning {
            DispatchQueue.global(qos: .userInitiated).async { [session] in
                session.stopRunning()
            }
        }
    }

    private func configure() {
        guard let device = AVCaptureDevice.default(for: .video),
              let input = try? AVCaptureDeviceInput(device: device),
              session.canAddInput(input) else {
            return
        }
        session.addInput(input)

        let output = AVCaptureMetadataOutput()
        guard session.canAddOutput(output) else { return }
        session.addOutput(output)
        output.setMetadataObjectsDelegate(self, queue: .main)
        output.metadataObjectTypes = [.qr]

        let preview = AVCaptureVideoPreviewLayer(session: session)
        preview.videoGravity = .resizeAspectFill
        view.layer.addSublayer(preview)
        previewLayer = preview
    }

    func metadataOutput(
        _ output: AVCaptureMetadataOutput,
        didOutput metadataObjects: [AVMetadataObject],
        from connection: AVCaptureConnection
    ) {
        guard !didReadCode,
              let object = metadataObjects.first as? AVMetadataMachineReadableCodeObject,
              let value = object.stringValue else { return }
        didReadCode = true
        onCode?(value)
    }
}

private func extractVehicleQrToken(_ raw: String) -> String? {
    let value = raw.trimmingCharacters(in: .whitespacesAndNewlines)
    let prefix = "tapaddis://vehicle-qr/"
    if value.lowercased().hasPrefix(prefix) {
        return value.components(separatedBy: "/").last?.isEmpty == false ? value.components(separatedBy: "/").last : nil
    }
    if !value.contains(" "), value.count >= 20 {
        return value
    }
    return nil
}

