import Foundation

struct CustomerSession: Codable, Equatable {
    let token: String
    let userId: String
    let name: String
    let phone: String
    let role: String
    var walletBalance: Double
    let cardToken: String?
    let status: String
    let mustChangePin: Bool
    var avatarUrl: String?
}

struct CustomerUserDTO: Codable {
    let id: String
    let name: String?
    let phone: String
    let role: String
    let walletBalance: Double?
    let cardToken: String?
    let status: String?
    let mustChangePin: Bool?
    let avatarUrl: String?
}

struct AuthResponse: Decodable {
    let token: String
    let user: CustomerUserDTO
}

struct WalletBalanceSnapshot: Decodable {
    let balance: Double
    let walletCode: String
}

struct WalletActivity: Decodable, Identifiable, Hashable {
    let id: String
    let source: String
    let title: String
    let subtitle: String
    let amount: Double
    let direction: String
    let status: String
    let createdAt: String
    let reference: String
}

struct CustomerNotificationFeed: Decodable {
    let unreadCount: Int
    let items: [CustomerNotification]
}

struct CustomerNotification: Decodable, Identifiable, Hashable {
    let id: String
    let type: String
    let title: String
    let body: String
    let status: String
    let createdAt: String
    let readAt: String?
}

struct RegisteredCard: Decodable, Identifiable, Hashable {
    let id: String
    let label: String
    let cardType: String
    let techType: String
    let brandHint: String?
    let last4: String?
    let isDefault: Bool
    let status: String
}

struct VehicleFareBand: Decodable, Identifiable, Hashable {
    let id: String
    let code: String
    let vehicleClass: String
    let vehicleClassLabel: String
    let amountEtb: Double
    let distanceLabel: String
    let label: String
}

struct VehicleQrScan: Decodable, Hashable {
    let vehicleId: String
    let routeId: String?
    let routeName: String?
    let routeCode: String?
    let shiftId: String
    let label: String?
    let vehicleClass: String?
    let vehicleClassLabel: String?
    let activeFareBands: [VehicleFareBand]
    let qrAvailable: Bool
}

struct VehicleQrPaymentReceipt: Decodable, Hashable {
    let transactionId: String
    let fare: Double
    let balanceBefore: Double
    let balanceAfter: Double
    let vehicleId: String?
    let routeName: String?
}

struct StoredProfile: Codable, Equatable {
    let userId: String
    let name: String
    let phone: String
    let role: String
    let status: String
    let avatarUrl: String?
}

enum TapAddisLanguage: String, CaseIterable, Identifiable {
    case english = "EN"
    case amharic = "አማ"
    case oromo = "OR"
    case tigrinya = "ትግ"

    var id: String { rawValue }

    var label: String {
        switch self {
        case .english:
            return "English"
        case .amharic:
            return "አማርኛ"
        case .oromo:
            return "Afaan Oromo"
        case .tigrinya:
            return "ትግርኛ"
        }
    }
}

extension CustomerSession {
    init(token: String, user: CustomerUserDTO) {
        self.token = token
        self.userId = user.id
        self.name = user.name?.isEmpty == false ? user.name! : "TapAddis User"
        self.phone = user.phone
        self.role = user.role
        self.walletBalance = user.walletBalance ?? 0
        self.cardToken = user.cardToken
        self.status = user.status ?? "ACTIVE"
        self.mustChangePin = user.mustChangePin ?? false
        self.avatarUrl = user.avatarUrl
    }

    var storedProfile: StoredProfile {
        StoredProfile(userId: userId, name: name, phone: phone, role: role, status: status, avatarUrl: avatarUrl)
    }

    func with(balance: Double) -> CustomerSession {
        var copy = self
        copy.walletBalance = balance
        return copy
    }

    func with(avatarUrl: String?) -> CustomerSession {
        var copy = self
        copy.avatarUrl = avatarUrl
        return copy
    }
}
