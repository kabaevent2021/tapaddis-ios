import Foundation
import LocalAuthentication

@MainActor
final class AppViewModel: ObservableObject {
    enum RootState: Equatable {
        case signedOut
        case locked
        case signedIn
    }

    @Published private(set) var rootState: RootState = .signedOut
    @Published private(set) var session: CustomerSession?
    @Published private(set) var recentActivity: [WalletActivity] = []
    @Published private(set) var notifications = CustomerNotificationFeed(unreadCount: 0, items: [])
    @Published private(set) var cards: [RegisteredCard] = []
    @Published var language: TapAddisLanguage
    @Published var savedPhone: String = ""
    @Published var isLoadingHome = false
    @Published var lastError: String?

    let api = TapAddisAPI()
    private let store = SecureSessionStore()
    private let biometrics = BiometricAuthenticator()

    var canUseBiometrics: Bool { biometrics.isAvailable() }
    var biometricEnabled: Bool { store.biometricEnabled }

    init() {
        language = store.language
        if let profile = store.loadProfile() {
            savedPhone = profile.phone
        }
        if store.biometricEnabled, store.loadToken() != nil {
            rootState = .locked
        }
    }

    func setLanguage(_ value: TapAddisLanguage) {
        language = value
        store.language = value
    }

    func login(phone: String, pin: String) async {
        lastError = nil
        do {
            let session = try await api.login(phone: phone, pin: pin)
            try store.save(session: session)
            self.session = session
            self.savedPhone = session.phone
            self.rootState = .signedIn
            await refreshHome()
        } catch {
            lastError = friendlyMessage(error)
        }
    }

    func register(name: String, phone: String, pin: String) async {
        lastError = nil
        do {
            let session = try await api.register(name: name, phone: phone, pin: pin)
            try store.save(session: session)
            self.session = session
            self.savedPhone = session.phone
            self.rootState = .signedIn
            await refreshHome()
        } catch {
            lastError = friendlyMessage(error)
        }
    }

    func unlockWithBiometrics() async {
        lastError = nil
        do {
            guard try await biometrics.authenticate(reason: "Unlock TapAddis") else { return }
            guard let token = store.loadToken() else {
                rootState = .signedOut
                return
            }
            let profile = try await api.getProfile(token: token)
            try store.save(session: profile)
            session = profile
            rootState = .signedIn
            await refreshHome()
        } catch {
            lastError = "Use your PIN to sign in."
        }
    }

    func usePINInstead() {
        rootState = .signedOut
    }

    func enableBiometricUnlock(_ enabled: Bool) async {
        lastError = nil
        if enabled {
            guard canUseBiometrics else {
                lastError = "Biometric unlock is not available on this phone."
                return
            }
            do {
                guard try await biometrics.authenticate(reason: "Enable biometric unlock for TapAddis") else { return }
                store.biometricEnabled = true
                objectWillChange.send()
            } catch {
                lastError = "Biometric unlock was not enabled."
            }
        } else {
            store.biometricEnabled = false
            objectWillChange.send()
        }
    }

    func refreshHome() async {
        guard let token = session?.token else { return }
        isLoadingHome = true
        defer { isLoadingHome = false }
        do {
            async let balance = api.getBalance(token: token)
            async let activity = api.getActivity(token: token)
            async let feed = api.getNotifications(token: token)
            async let linkedCards = api.getRegisteredCards(token: token)
            let result = try await (balance, activity, feed, linkedCards)
            recentActivity = Array(result.1.prefix(8))
            notifications = result.2
            cards = result.3
            if var current = session {
                current.walletBalance = result.0.balance
                session = current
                try? store.save(session: current)
            }
        } catch {
            lastError = friendlyMessage(error)
        }
    }

    func markNotificationRead(_ id: String) async {
        guard let token = session?.token else { return }
        do {
            try await api.markNotificationRead(token: token, id: id)
            await refreshHome()
        } catch {
            lastError = friendlyMessage(error)
        }
    }

    func markAllNotificationsRead() async {
        guard let token = session?.token else { return }
        do {
            try await api.markAllNotificationsRead(token: token)
            await refreshHome()
        } catch {
            lastError = friendlyMessage(error)
        }
    }

    func uploadAvatar(jpegData: Data) async {
        guard let current = session else { return }
        do {
            let user = try await api.uploadAvatar(
                token: current.token,
                jpegData: jpegData,
                filename: "avatar_\(current.userId).jpg"
            )
            let updated = CustomerSession(token: current.token, user: user).with(balance: current.walletBalance)
            session = updated
            try store.save(session: updated)
        } catch {
            lastError = "Could not upload this photo."
        }
    }

    func logout() {
        let token = session?.token
        session = nil
        rootState = .signedOut
        store.clearAll()
        if let token {
            Task { await api.logout(token: token) }
        }
    }

    private func friendlyMessage(_ error: Error) -> String {
        if let apiError = error as? TapAddisAPIError {
            switch apiError {
            case .server(let message, let code, _):
                switch code {
                case "INVALID_CREDENTIALS": return "Phone number or PIN is incorrect."
                case "PIN_WEAK": return "PIN must be 4 digits."
                case "ROLE_FORBIDDEN": return "This app only works with TapAddis customer accounts."
                default: return message
                }
            default:
                return apiError.localizedDescription
            }
        }
        return error.localizedDescription
    }
}

