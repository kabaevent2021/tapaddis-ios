import Foundation
import LocalAuthentication
import Security

final class SecureSessionStore {
    private let service = "com.tapaddis.customer.session"
    private let tokenAccount = "authToken"
    private let defaults = UserDefaults.standard
    private let profileKey = "tapaddis.customer.profile"
    private let biometricKey = "tapaddis.customer.biometric.enabled"
    private let languageKey = "tapaddis.customer.language"

    var biometricEnabled: Bool {
        get { defaults.bool(forKey: biometricKey) }
        set { defaults.set(newValue, forKey: biometricKey) }
    }

    var language: TapAddisLanguage {
        get {
            TapAddisLanguage(rawValue: defaults.string(forKey: languageKey) ?? "") ?? .english
        }
        set {
            defaults.set(newValue.rawValue, forKey: languageKey)
        }
    }

    func save(session: CustomerSession) throws {
        try saveToken(session.token)
        let data = try JSONEncoder().encode(session.storedProfile)
        defaults.set(data, forKey: profileKey)
    }

    func update(profile: StoredProfile) throws {
        let data = try JSONEncoder().encode(profile)
        defaults.set(data, forKey: profileKey)
    }

    func loadProfile() -> StoredProfile? {
        guard let data = defaults.data(forKey: profileKey) else { return nil }
        return try? JSONDecoder().decode(StoredProfile.self, from: data)
    }

    func loadToken() -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenAccount,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var result: AnyObject?
        let status = SecItemCopyMatching(query as CFDictionary, &result)
        guard status == errSecSuccess, let data = result as? Data else { return nil }
        return String(data: data, encoding: .utf8)
    }

    func clearAll() {
        deleteToken()
        defaults.removeObject(forKey: profileKey)
        defaults.removeObject(forKey: biometricKey)
    }

    private func saveToken(_ token: String) throws {
        deleteToken()
        guard let data = token.data(using: .utf8) else { return }
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenAccount,
            kSecAttrAccessible as String: kSecAttrAccessibleWhenUnlockedThisDeviceOnly,
            kSecValueData as String: data
        ]
        let status = SecItemAdd(query as CFDictionary, nil)
        guard status == errSecSuccess else {
            throw NSError(domain: NSOSStatusErrorDomain, code: Int(status), userInfo: nil)
        }
    }

    private func deleteToken() {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: tokenAccount
        ]
        SecItemDelete(query as CFDictionary)
    }
}

struct BiometricAuthenticator {
    func isAvailable() -> Bool {
        let context = LAContext()
        var error: NSError?
        return context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)
    }

    func authenticate(reason: String) async throws -> Bool {
        let context = LAContext()
        context.localizedCancelTitle = "Use PIN instead"
        return try await withCheckedThrowingContinuation { continuation in
            var error: NSError?
            guard context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error) else {
                continuation.resume(throwing: error ?? LAError(.biometryNotAvailable))
                return
            }
            context.evaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, localizedReason: reason) { success, error in
                if let error {
                    continuation.resume(throwing: error)
                } else {
                    continuation.resume(returning: success)
                }
            }
        }
    }
}

