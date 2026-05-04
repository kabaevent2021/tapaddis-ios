import Foundation

enum TapAddisAPIError: LocalizedError {
    case invalidURL
    case invalidResponse
    case server(message: String, code: String?, status: Int)
    case decoding

    var errorDescription: String? {
        switch self {
        case .invalidURL:
            return "Invalid server URL."
        case .invalidResponse:
            return "Server response was not valid."
        case .server(let message, _, _):
            return message
        case .decoding:
            return "Unable to read server response."
        }
    }
}

final class TapAddisAPI {
    private let baseURL = URL(string: "https://api.tapaddis.com/api")!
    private let backendOrigin = URL(string: "https://api.tapaddis.com")!
    private let decoder = JSONDecoder()
    private let encoder = JSONEncoder()

    func resolveAssetURL(_ path: String?) -> URL? {
        guard let path, !path.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty else { return nil }
        if let url = URL(string: path), url.scheme == "https" || url.scheme == "http" {
            return url
        }
        let cleanPath = path.hasPrefix("/") ? String(path.dropFirst()) : path
        return backendOrigin.appending(path: cleanPath)
    }

    func login(phone: String, pin: String) async throws -> CustomerSession {
        let response: AuthResponse = try await request(
            "auth/login",
            method: "POST",
            body: ["phone": phone, "pin": pin]
        )
        let session = CustomerSession(token: response.token, user: response.user)
        guard session.role == "CUSTOMER" else {
            throw TapAddisAPIError.server(message: "This app is only for customer accounts.", code: "ROLE_FORBIDDEN", status: 403)
        }
        return session
    }

    func register(name: String, phone: String, pin: String) async throws -> CustomerSession {
        let response: AuthResponse = try await request(
            "auth/register/customer",
            method: "POST",
            body: ["name": name, "phone": phone, "pin": pin]
        )
        return CustomerSession(token: response.token, user: response.user)
    }

    func getProfile(token: String) async throws -> CustomerSession {
        let user: CustomerUserDTO = try await request("auth/profile", token: token)
        return CustomerSession(token: token, user: user)
    }

    func getBalance(token: String) async throws -> WalletBalanceSnapshot {
        try await request("wallet/balance", token: token)
    }

    func getActivity(token: String) async throws -> [WalletActivity] {
        try await request("wallet/activity", token: token)
    }

    func getNotifications(token: String) async throws -> CustomerNotificationFeed {
        try await request("notifications", token: token)
    }

    func markNotificationRead(token: String, id: String) async throws {
        let _: EmptyResponse = try await request("notifications/\(id)/read", method: "PATCH", token: token)
    }

    func markAllNotificationsRead(token: String) async throws {
        let _: EmptyResponse = try await request("notifications/read-all", method: "POST", token: token, body: EmptyBody())
    }

    func getRegisteredCards(token: String) async throws -> [RegisteredCard] {
        try await request("wallet/cards", token: token)
    }

    func scanVehicleQr(token: String, qrToken: String) async throws -> VehicleQrScan {
        let encoded = qrToken.addingPercentEncoding(withAllowedCharacters: .urlPathAllowed) ?? qrToken
        return try await request("qr/scan/\(encoded)", token: token)
    }

    func scanVehiclePayCode(token: String, payCode: String) async throws -> String {
        let response: PayCodeResponse = try await request("qr/scan-code/\(payCode)", token: token)
        guard !response.token.isEmpty else {
            throw TapAddisAPIError.server(message: "That vehicle code is not ready for payment right now.", code: "QR_CODE_UNAVAILABLE", status: 404)
        }
        return response.token
    }

    func payVehicleQr(token: String, qrToken: String, fareBandId: String) async throws -> VehicleQrPaymentReceipt {
        try await request(
            "qr/pay",
            method: "POST",
            token: token,
            body: [
                "token": qrToken,
                "fareBandId": fareBandId,
                "clientRequestId": UUID().uuidString
            ]
        )
    }

    func uploadAvatar(token: String, jpegData: Data, filename: String) async throws -> CustomerUserDTO {
        guard !jpegData.isEmpty else {
            throw TapAddisAPIError.server(message: "Could not upload this photo.", code: "AVATAR_EMPTY", status: 0)
        }
        let boundary = "TapAddisBoundary\(UUID().uuidString)"
        var request = URLRequest(url: baseURL.appending(path: "auth/profile/avatar"))
        request.httpMethod = "POST"
        request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        request.setValue("multipart/form-data; boundary=\(boundary)", forHTTPHeaderField: "Content-Type")

        var body = Data()
        body.append("--\(boundary)\r\n")
        body.append("Content-Disposition: form-data; name=\"file\"; filename=\"\(filename)\"\r\n")
        body.append("Content-Type: image/jpeg\r\n\r\n")
        body.append(jpegData)
        body.append("\r\n--\(boundary)--\r\n")
        request.httpBody = body

        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(data: data, response: response)
        return try decoder.decode(CustomerUserDTO.self, from: data)
    }

    func logout(token: String) async {
        try? await requestRaw("auth/logout", method: "POST", token: token, body: EmptyBody())
    }

    private func request<T: Decodable>(
        _ path: String,
        method: String = "GET",
        token: String? = nil
    ) async throws -> T {
        let data = try await requestRaw(path, method: method, token: token)
        return try decode(data)
    }

    private func request<T: Decodable, Body: Encodable>(
        _ path: String,
        method: String = "GET",
        token: String? = nil,
        body: Body
    ) async throws -> T {
        let data = try await requestRaw(path, method: method, token: token, body: body)
        return try decode(data)
    }

    private func decode<T: Decodable>(_ data: Data) throws -> T {
        if T.self == EmptyResponse.self, data.isEmpty {
            return EmptyResponse() as! T
        }
        do {
            return try decoder.decode(T.self, from: data)
        } catch {
            if T.self == EmptyResponse.self {
                return EmptyResponse() as! T
            }
            throw TapAddisAPIError.decoding
        }
    }

    @discardableResult
    private func requestRaw(
        _ path: String,
        method: String,
        token: String?
    ) async throws -> Data {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        return try await perform(request)
    }

    @discardableResult
    private func requestRaw<Body: Encodable>(
        _ path: String,
        method: String,
        token: String?,
        body: Body
    ) async throws -> Data {
        var request = URLRequest(url: baseURL.appending(path: path))
        request.httpMethod = method
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        if let token {
            request.setValue("Bearer \(token)", forHTTPHeaderField: "Authorization")
        }
        request.httpBody = try encoder.encode(body)
        return try await perform(request)
    }

    private func perform(_ request: URLRequest) async throws -> Data {
        let (data, response) = try await URLSession.shared.data(for: request)
        try validate(data: data, response: response)
        return data
    }

    private func validate(data: Data, response: URLResponse) throws {
        guard let http = response as? HTTPURLResponse else {
            throw TapAddisAPIError.invalidResponse
        }
        guard (200...299).contains(http.statusCode) else {
            let error = try? decoder.decode(ServerErrorResponse.self, from: data)
            throw TapAddisAPIError.server(
                message: error?.message ?? "Request failed.",
                code: error?.code,
                status: http.statusCode
            )
        }
    }
}

private struct EmptyBody: Encodable {}

private struct EmptyResponse: Decodable {}

private struct ServerErrorResponse: Decodable {
    let message: String?
    let code: String?
}

private struct PayCodeResponse: Decodable {
    let token: String
}

private extension Data {
    mutating func append(_ value: String) {
        append(value.data(using: .utf8) ?? Data())
    }
}
