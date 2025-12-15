import Security
import Tauri
import UIKit
import WebKit

class PingArgs: Decodable {
  let value: String?
}

class GetOrCreateSqliteKeyArgs: Decodable {
  let service: String?
  let account: String?
}

enum KeychainError: Error {
  case unexpectedData
  case unhandled(OSStatus)
}

private func generateSqliteKey() -> String {
  func uuidSimple() -> String { UUID().uuidString.replacingOccurrences(of: "-", with: "") }
  return "hula_" + uuidSimple() + uuidSimple()
}

private func keychainGet(service: String, account: String) throws -> String? {
  let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: service,
    kSecAttrAccount as String: account,
    kSecReturnData as String: true,
    kSecMatchLimit as String: kSecMatchLimitOne,
  ]

  var item: CFTypeRef?
  let status = SecItemCopyMatching(query as CFDictionary, &item)

  if status == errSecItemNotFound {
    return nil
  }
  guard status == errSecSuccess else {
    throw KeychainError.unhandled(status)
  }

  guard let data = item as? Data, let value = String(data: data, encoding: .utf8) else {
    throw KeychainError.unexpectedData
  }

  return value
}

private func keychainSet(service: String, account: String, value: String) throws {
  let query: [String: Any] = [
    kSecClass as String: kSecClassGenericPassword,
    kSecAttrService as String: service,
    kSecAttrAccount as String: account,
  ]

  let attributes: [String: Any] = [
    kSecValueData as String: value.data(using: .utf8)!,
    kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly,
  ]

  let updateStatus = SecItemUpdate(query as CFDictionary, attributes as CFDictionary)
  if updateStatus == errSecSuccess {
    return
  }

  if updateStatus != errSecItemNotFound {
    throw KeychainError.unhandled(updateStatus)
  }

  var addQuery = query
  for (k, v) in attributes {
    addQuery[k] = v
  }

  let addStatus = SecItemAdd(addQuery as CFDictionary, nil)
  guard addStatus == errSecSuccess else {
    throw KeychainError.unhandled(addStatus)
  }
}

class ExamplePlugin: Plugin {
  @objc public func ping(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(PingArgs.self)
    invoke.resolve(["value": args.value ?? ""])
  }

  @objc public func getOrCreateSqliteKey(_ invoke: Invoke) throws {
    let args = try invoke.parseArgs(GetOrCreateSqliteKeyArgs.self)

    let defaultService = "com.hula.pc"
    let defaultAccount = "hula_sqlcipher_key_v3"

    let service = args.service ?? defaultService
    let account = args.account ?? defaultAccount

    if let existing = try keychainGet(service: service, account: account) {
      invoke.resolve(["key": existing])
      return
    }

    let value = generateSqliteKey()
    try keychainSet(service: service, account: account, value: value)
    invoke.resolve(["key": value])
  }
}

@_cdecl("init_plugin_hula")
func initPlugin() -> Plugin {
  return ExamplePlugin()
}
