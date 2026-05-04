import PhotosUI
import SwiftUI
import UIKit

struct MainTabView: View {
    @EnvironmentObject private var app: AppViewModel

    var body: some View {
        TabView {
            WalletView()
                .tabItem { Label("Wallet", systemImage: "wallet.pass") }
            PassView()
                .tabItem { Label("Pass", systemImage: "creditcard") }
            ProfileView()
                .tabItem { Label("Profile", systemImage: "person.fill") }
        }
        .task {
            await app.refreshHome()
        }
    }
}

struct WalletView: View {
    @EnvironmentObject private var app: AppViewModel
    @State private var showScanner = false
    @State private var paymentPath: [String] = []
    @State private var payCode = ""
    @State private var codeLoading = false

    var body: some View {
        NavigationStack(path: $paymentPath) {
            ScrollView {
                VStack(spacing: 18) {
                    walletHeader
                    balanceCard
                    vehicleCodeCard
                    actionRow
                    recentActivity
                    Spacer(minLength: 80)
                }
                .padding(.horizontal, 20)
                .padding(.top, 18)
            }
            .background(TapAddisTheme.background)
            .refreshable {
                await app.refreshHome()
            }
            .navigationDestination(for: String.self) { token in
                VehiclePaymentView(qrToken: token)
            }
            .fullScreenCover(isPresented: $showScanner) {
                VehicleQrScannerSheet { token in
                    showScanner = false
                    paymentPath.append(token)
                }
            }
        }
    }

    private var walletHeader: some View {
        HStack(spacing: 12) {
            AvatarView(url: app.api.resolveAssetURL(app.session?.avatarUrl), size: 46)
            VStack(alignment: .leading, spacing: 3) {
                Text("Good morning")
                    .font(.system(size: 12))
                    .foregroundStyle(TapAddisTheme.secondary)
                Text(app.session?.name ?? "TapAddis User")
                    .font(.system(size: 22, weight: .black))
            }
            Spacer()
            LanguageMenu()
            NavigationLink {
                NotificationsView()
            } label: {
                ZStack(alignment: .topTrailing) {
                    Image(systemName: "bell.fill")
                        .font(.system(size: 18, weight: .semibold))
                        .frame(width: 42, height: 42)
                        .foregroundStyle(TapAddisTheme.text)
                        .background(.white)
                        .clipShape(Circle())
                        .overlay(Circle().stroke(TapAddisTheme.border))
                    if app.notifications.unreadCount > 0 {
                        Text("\(min(app.notifications.unreadCount, 9))")
                            .font(.system(size: 10, weight: .black))
                            .foregroundStyle(.white)
                            .frame(width: 18, height: 18)
                            .background(TapAddisTheme.danger)
                            .clipShape(Circle())
                    }
                }
            }
        }
    }

    private var balanceCard: some View {
        VStack(alignment: .leading, spacing: 22) {
            HStack {
                Image("TapAddisLogo")
                    .resizable()
                    .scaledToFit()
                    .frame(height: 38)
                Spacer()
                Image(systemName: "eye.fill")
                    .font(.system(size: 22, weight: .bold))
                    .foregroundStyle(.white)
            }
            Spacer()
            Text("Balance")
                .font(.system(size: 15))
                .foregroundStyle(.white.opacity(0.72))
            HStack(alignment: .firstTextBaseline, spacing: 8) {
                Text("ETB")
                    .font(.system(size: 22, weight: .medium))
                    .foregroundStyle(.white.opacity(0.80))
                Text((app.session?.walletBalance ?? 0).formatted(.number.precision(.fractionLength(2))))
                    .font(.system(size: 46, weight: .black))
                    .foregroundStyle(.white)
            }
        }
        .padding(26)
        .frame(height: 180)
        .background(TapAddisTheme.cardGradient)
        .clipShape(RoundedRectangle(cornerRadius: 26, style: .continuous))
        .overlay(RoundedRectangle(cornerRadius: 26).stroke(Color.white.opacity(0.08)))
    }

    private var vehicleCodeCard: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Use vehicle code")
                .font(.system(size: 15, weight: .bold))
            HStack(spacing: 10) {
                TextField("6-digit code", text: $payCode)
                    .keyboardType(.numberPad)
                    .onChange(of: payCode) { payCode = String($0.filter(\.isNumber).prefix(6)) }
                    .padding(14)
                    .background(TapAddisTheme.background)
                    .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                Button {
                    Task { await openCode() }
                } label: {
                    codeLoading ? AnyView(ProgressView()) : AnyView(Text("Continue"))
                }
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(.white)
                .padding(.horizontal, 14)
                .frame(height: 48)
                .background(payCode.count == 6 ? Color.black : Color.gray.opacity(0.4))
                .clipShape(RoundedRectangle(cornerRadius: 14, style: .continuous))
                .disabled(payCode.count != 6 || codeLoading)
            }
            if let error = app.lastError {
                Text(error)
                    .font(.system(size: 12, weight: .semibold))
                    .foregroundStyle(TapAddisTheme.danger)
            }
        }
        .cardStyle()
    }

    private var actionRow: some View {
        HStack(spacing: 14) {
            Button {
                showScanner = true
            } label: {
                Label("Scan vehicle QR", systemImage: "qrcode.viewfinder")
            }
            .buttonStyle(PrimaryButtonStyle(disabled: false))
        }
    }

    private var recentActivity: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack {
                Text("Recent Activity")
                    .font(.system(size: 20, weight: .black))
                Spacer()
            }
            VStack(spacing: 0) {
                if app.recentActivity.isEmpty {
                    Text("No activity yet.")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(TapAddisTheme.secondary)
                        .frame(maxWidth: .infinity, alignment: .leading)
                        .padding(.vertical, 8)
                } else {
                    ForEach(app.recentActivity.prefix(3)) { item in
                        ActivityRow(item: item)
                        if item.id != app.recentActivity.prefix(3).last?.id {
                            Divider()
                        }
                    }
                }
            }
            .cardStyle()
        }
    }

    private func openCode() async {
        guard let token = app.session?.token else { return }
        codeLoading = true
        defer { codeLoading = false }
        do {
            paymentPath.append(try await app.api.scanVehiclePayCode(token: token, payCode: payCode))
        } catch {
            app.lastError = error.localizedDescription
        }
    }
}

struct VehiclePaymentView: View {
    @EnvironmentObject private var app: AppViewModel
    let qrToken: String
    @State private var scan: VehicleQrScan?
    @State private var selectedFareId: String?
    @State private var loading = true
    @State private var paying = false
    @State private var success: VehicleQrPaymentReceipt?
    @State private var error: String?

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                if loading {
                    ProgressView("Loading fares...")
                        .frame(maxWidth: .infinity)
                        .padding(.top, 60)
                } else if let scan {
                    vehicleCard(scan)
                    fareList(scan.activeFareBands)
                    if let success {
                        successCard(success)
                    }
                    if let error {
                        ErrorBanner(message: error)
                    }
                    Button {
                        Task { await pay() }
                    } label: {
                        paying ? AnyView(ProgressView().tint(.white)) : AnyView(Text("Pay fare"))
                    }
                    .buttonStyle(PrimaryButtonStyle(disabled: selectedFareId == nil || paying))
                    .disabled(selectedFareId == nil || paying)
                } else {
                    ErrorBanner(message: error ?? "Unable to load vehicle payment.")
                }
            }
            .padding(20)
        }
        .background(TapAddisTheme.background)
        .navigationTitle("Vehicle payment")
        .toolbar {
            Button("Refresh fares") {
                Task { await load() }
            }
        }
        .task {
            await load()
        }
    }

    private func vehicleCard(_ scan: VehicleQrScan) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text(scan.label ?? scan.vehicleId)
                .font(.system(size: 24, weight: .black))
            Text([scan.routeName, scan.vehicleClassLabel].compactMap { $0 }.joined(separator: " · "))
                .font(.system(size: 14))
                .foregroundStyle(TapAddisTheme.secondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private func fareList(_ fares: [VehicleFareBand]) -> some View {
        VStack(alignment: .leading, spacing: 12) {
            Text("Choose fare")
                .font(.system(size: 18, weight: .black))
            ForEach(fares) { fare in
                Button {
                    selectedFareId = fare.id
                } label: {
                    HStack {
                        VStack(alignment: .leading, spacing: 4) {
                            Text(fare.label)
                                .font(.system(size: 16, weight: .bold))
                            Text(fare.distanceLabel)
                                .font(.system(size: 12))
                                .foregroundStyle(TapAddisTheme.secondary)
                        }
                        Spacer()
                        Text("\(fare.amountEtb.formatted(.number.precision(.fractionLength(2)))) ETB")
                            .font(.system(size: 16, weight: .black))
                    }
                    .foregroundStyle(TapAddisTheme.text)
                    .padding(16)
                    .background(selectedFareId == fare.id ? TapAddisTheme.accent.opacity(0.18) : .white)
                    .clipShape(RoundedRectangle(cornerRadius: 16, style: .continuous))
                    .overlay(RoundedRectangle(cornerRadius: 16).stroke(TapAddisTheme.border))
                }
            }
        }
    }

    private func successCard(_ receipt: VehicleQrPaymentReceipt) -> some View {
        VStack(alignment: .leading, spacing: 8) {
            Text("Payment successful")
                .font(.system(size: 18, weight: .black))
                .foregroundStyle(TapAddisTheme.success)
            Text("\(receipt.fare.formatted(.number.precision(.fractionLength(2)))) ETB paid. Balance: \(receipt.balanceAfter.formatted(.number.precision(.fractionLength(2)))) ETB.")
                .font(.system(size: 14))
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .cardStyle()
    }

    private func load() async {
        guard let token = app.session?.token else { return }
        loading = true
        error = nil
        defer { loading = false }
        do {
            let result = try await app.api.scanVehicleQr(token: token, qrToken: qrToken)
            scan = result
            if let selectedFareId, result.activeFareBands.contains(where: { $0.id == selectedFareId }) {
                self.selectedFareId = selectedFareId
            } else {
                self.selectedFareId = result.activeFareBands.first?.id
            }
        } catch {
            self.error = error.localizedDescription
        }
    }

    private func pay() async {
        guard let token = app.session?.token, let selectedFareId else { return }
        paying = true
        error = nil
        defer { paying = false }
        do {
            let fresh = try await app.api.scanVehicleQr(token: token, qrToken: qrToken)
            guard fresh.activeFareBands.contains(where: { $0.id == selectedFareId }) else {
                scan = fresh
                self.selectedFareId = fresh.activeFareBands.first?.id
                error = "Fare changed. Choose again."
                return
            }
            success = try await app.api.payVehicleQr(token: token, qrToken: qrToken, fareBandId: selectedFareId)
            await app.refreshHome()
        } catch {
            self.error = error.localizedDescription
        }
    }
}

struct PassView: View {
    @EnvironmentObject private var app: AppViewModel

    var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text("TapAddis Pass")
                        .font(.system(size: 28, weight: .black))
                    Spacer()
                    LanguageMenu()
                }
                VStack(alignment: .leading, spacing: 12) {
                    InfoPill(text: "Active", color: TapAddisTheme.success)
                    Text("QR payment and linked kiosk cards.")
                        .font(.system(size: 14))
                        .foregroundStyle(TapAddisTheme.secondary)
                }
                .cardStyle()

                VStack(alignment: .leading, spacing: 12) {
                    Text("Linked cards")
                        .font(.system(size: 20, weight: .black))
                    if app.cards.isEmpty {
                        Text("No linked physical cards yet.")
                            .font(.system(size: 14, weight: .semibold))
                            .foregroundStyle(TapAddisTheme.secondary)
                    } else {
                        ForEach(app.cards) { card in
                            Text(card.label)
                                .font(.system(size: 15, weight: .bold))
                        }
                    }
                }
                .frame(maxWidth: .infinity, alignment: .leading)
                .cardStyle()
            }
            .padding(20)
        }
        .background(TapAddisTheme.background)
        .refreshable { await app.refreshHome() }
    }
}

struct NotificationsView: View {
    @EnvironmentObject private var app: AppViewModel

    var body: some View {
        List {
            if app.notifications.items.isEmpty {
                Text("No notifications yet.")
            } else {
                ForEach(app.notifications.items) { item in
                    Button {
                        Task { await app.markNotificationRead(item.id) }
                    } label: {
                        VStack(alignment: .leading, spacing: 6) {
                            Text(item.title)
                                .font(.headline)
                            Text(item.body)
                                .font(.subheadline)
                                .foregroundStyle(.secondary)
                            Text(item.createdAt)
                                .font(.caption)
                                .foregroundStyle(.secondary)
                        }
                    }
                }
            }
        }
        .navigationTitle("Notifications")
        .toolbar {
            Button("Mark all read") {
                Task { await app.markAllNotificationsRead() }
            }
        }
        .refreshable { await app.refreshHome() }
    }
}

struct ProfileView: View {
    @EnvironmentObject private var app: AppViewModel
    @State private var selectedPhoto: PhotosPickerItem?
    @State private var uploadMessage: String?

    var body: some View {
        ScrollView {
            VStack(spacing: 18) {
                HStack {
                    Text("Profile")
                        .font(.system(size: 28, weight: .black))
                    Spacer()
                    LanguageMenu()
                }

                VStack(spacing: 10) {
                    PhotosPicker(selection: $selectedPhoto, matching: .images) {
                        AvatarView(url: app.api.resolveAssetURL(app.session?.avatarUrl), size: 96)
                            .overlay(alignment: .bottomTrailing) {
                                Image(systemName: "camera.fill")
                                    .font(.system(size: 13, weight: .bold))
                                    .foregroundStyle(.white)
                                    .frame(width: 28, height: 28)
                                    .background(Color.black)
                                    .clipShape(Circle())
                            }
                    }
                    Text(app.session?.name ?? "TapAddis User")
                        .font(.system(size: 22, weight: .black))
                    Text(app.session?.phone ?? "")
                        .font(.system(size: 13))
                        .foregroundStyle(TapAddisTheme.secondary)
                    if let uploadMessage {
                        Text(uploadMessage)
                            .font(.system(size: 12, weight: .semibold))
                            .foregroundStyle(TapAddisTheme.secondary)
                    }
                }
                .frame(maxWidth: .infinity)
                .cardStyle()

                VStack(spacing: 0) {
                    SettingsRow(title: "Biometric unlock", subtitle: app.canUseBiometrics ? (app.biometricEnabled ? "On" : "Off") : "Set up fingerprint or face unlock on this phone first.") {
                        Toggle("", isOn: Binding(
                            get: { app.biometricEnabled },
                            set: { enabled in Task { await app.enableBiometricUnlock(enabled) } }
                        ))
                        .labelsHidden()
                        .disabled(!app.canUseBiometrics)
                    }
                    Divider()
                    SettingsRow(title: "Language", subtitle: app.language.label) {
                        LanguageMenu()
                    }
                    Divider()
                    Button(role: .destructive) {
                        app.logout()
                    } label: {
                        Text("Sign out")
                            .font(.system(size: 16, weight: .bold))
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .padding(.vertical, 16)
                    }
                }
                .cardStyle()

                if let error = app.lastError {
                    ErrorBanner(message: error)
                }
            }
            .padding(20)
        }
        .background(TapAddisTheme.background)
        .refreshable { await app.refreshHome() }
        .task(id: selectedPhoto) {
            await uploadSelectedPhoto()
        }
    }

    private func uploadSelectedPhoto() async {
        guard let selectedPhoto else { return }
        uploadMessage = "Uploading photo..."
        do {
            guard let data = try await selectedPhoto.loadTransferable(type: Data.self),
                  let jpeg = normalizedAvatarJPEG(from: data) else {
                uploadMessage = "Could not upload this photo."
                return
            }
            await app.uploadAvatar(jpegData: jpeg)
            uploadMessage = "Profile photo updated."
        } catch {
            uploadMessage = "Could not upload this photo."
        }
    }
}

private struct SettingsRow<Trailing: View>: View {
    let title: String
    let subtitle: String
    @ViewBuilder let trailing: () -> Trailing

    var body: some View {
        HStack(spacing: 12) {
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(.system(size: 16, weight: .bold))
                Text(subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(TapAddisTheme.secondary)
            }
            Spacer()
            trailing()
        }
        .padding(.vertical, 14)
    }
}

private struct AvatarView: View {
    let url: URL?
    let size: CGFloat

    var body: some View {
        AsyncImage(url: url) { phase in
            switch phase {
            case .success(let image):
                image.resizable().scaledToFill()
            default:
                Image(systemName: "person.fill")
                    .resizable()
                    .scaledToFit()
                    .padding(size * 0.28)
                    .foregroundStyle(.black)
            }
        }
        .frame(width: size, height: size)
        .background(.white)
        .clipShape(Circle())
        .overlay(Circle().stroke(TapAddisTheme.border, lineWidth: 1))
    }
}

private struct ActivityRow: View {
    let item: WalletActivity

    var body: some View {
        HStack(spacing: 14) {
            Image(systemName: item.amount >= 0 ? "plus.rectangle.fill" : "bus.fill")
                .frame(width: 44, height: 44)
                .background(TapAddisTheme.background)
                .clipShape(RoundedRectangle(cornerRadius: 12))
            VStack(alignment: .leading, spacing: 3) {
                Text(item.title)
                    .font(.system(size: 15, weight: .bold))
                Text(item.subtitle)
                    .font(.system(size: 12))
                    .foregroundStyle(TapAddisTheme.secondary)
                Text(item.createdAt)
                    .font(.system(size: 11))
                    .foregroundStyle(TapAddisTheme.secondary)
            }
            Spacer()
            Text("\(item.amount >= 0 ? "+" : "-") \(abs(item.amount).formatted(.number.precision(.fractionLength(2)))) ETB")
                .font(.system(size: 14, weight: .black))
                .foregroundStyle(item.amount >= 0 ? TapAddisTheme.success : TapAddisTheme.danger)
        }
        .padding(.vertical, 12)
    }
}

private func normalizedAvatarJPEG(from data: Data) -> Data? {
    guard let image = UIImage(data: data), let cgImage = image.cgImage else { return nil }
    let width = CGFloat(cgImage.width)
    let height = CGFloat(cgImage.height)
    let side = min(width, height)
    let crop = CGRect(x: (width - side) / 2, y: (height - side) / 2, width: side, height: side)
    guard let cropped = cgImage.cropping(to: crop) else { return nil }
    let renderer = UIGraphicsImageRenderer(size: CGSize(width: 512, height: 512))
    let square = renderer.image { _ in
        UIImage(cgImage: cropped, scale: image.scale, orientation: image.imageOrientation)
            .draw(in: CGRect(x: 0, y: 0, width: 512, height: 512))
    }
    return square.jpegData(compressionQuality: 0.86)
}
