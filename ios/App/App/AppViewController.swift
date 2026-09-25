import AVKit
import Foundation
import LocalAuthentication
import QuickLook
import SafariServices
import Security
import SwiftUI
import UIKit
import UserNotifications

extension Notification.Name {
    static let mescRemoteNotificationDeviceToken = Notification.Name("MESCRemoteNotificationDeviceToken")
    static let mescRemoteNotificationRegistrationFailed = Notification.Name("MESCRemoteNotificationRegistrationFailed")
    static let mescRemoteNotificationOpened = Notification.Name("MESCRemoteNotificationOpened")
    static let mescRemoteNotificationDeepLinkStorageKey = "mesc.native.pendingPushDeepLink"
}

final class AppViewController: UIViewController {
    private var hostingController: UIHostingController<MESCNativeRootView>?

    override func viewDidLoad() {
        super.viewDidLoad()

        MESCNativeTabBarStyler.apply()

        let rootView = MESCNativeRootView()
        let hostingController = UIHostingController(rootView: rootView)
        hostingController.view.backgroundColor = .clear

        addChild(hostingController)
        view.addSubview(hostingController.view)
        hostingController.view.translatesAutoresizingMaskIntoConstraints = false
        NSLayoutConstraint.activate([
            hostingController.view.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            hostingController.view.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            hostingController.view.topAnchor.constraint(equalTo: view.topAnchor),
            hostingController.view.bottomAnchor.constraint(equalTo: view.bottomAnchor)
        ])
        hostingController.didMove(toParent: self)

        self.hostingController = hostingController
    }

    override var preferredStatusBarStyle: UIStatusBarStyle {
        traitCollection.userInterfaceStyle == .dark ? .lightContent : .darkContent
    }
}

enum MESCNativeTabBarStyler {
    static func apply() {
        let selectedColor = UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(hex: 0xC5A059) : UIColor(hex: 0x722F37)
        }
        let normalColor = UIColor { traits in
            traits.userInterfaceStyle == .dark ? UIColor(hex: 0xA8A8A8) : UIColor(hex: 0x727272)
        }

        UITabBar.appearance().isTranslucent = true
        UITabBar.appearance().tintColor = selectedColor
        UITabBar.appearance().unselectedItemTintColor = normalColor

        guard #unavailable(iOS 26.0) else { return }

        let appearance = UITabBarAppearance()
        appearance.configureWithTransparentBackground()
        appearance.backgroundEffect = UIBlurEffect(style: .systemUltraThinMaterial)
        appearance.backgroundColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: 0x1C1C1E, alpha: 0.54)
                : UIColor(hex: 0xFFFFFF, alpha: 0.38)
        }
        appearance.shadowColor = UIColor { traits in
            traits.userInterfaceStyle == .dark
                ? UIColor(hex: 0xC5A059, alpha: 0.16)
                : UIColor(hex: 0xC5A059, alpha: 0.22)
        }

        configure(appearance.stackedLayoutAppearance, selectedColor: selectedColor, normalColor: normalColor)
        configure(appearance.inlineLayoutAppearance, selectedColor: selectedColor, normalColor: normalColor)
        configure(appearance.compactInlineLayoutAppearance, selectedColor: selectedColor, normalColor: normalColor)

        UITabBar.appearance().standardAppearance = appearance
        UITabBar.appearance().scrollEdgeAppearance = appearance
    }

    private static func configure(_ itemAppearance: UITabBarItemAppearance, selectedColor: UIColor, normalColor: UIColor) {
        itemAppearance.normal.iconColor = normalColor
        itemAppearance.normal.titleTextAttributes = [
            .foregroundColor: normalColor,
            .font: UIFont.systemFont(ofSize: 11, weight: .medium)
        ]
        itemAppearance.selected.iconColor = selectedColor
        itemAppearance.selected.titleTextAttributes = [
            .foregroundColor: selectedColor,
            .font: UIFont.systemFont(ofSize: 11, weight: .semibold)
        ]
    }
}

@MainActor
final class MESCNativeAppModel: ObservableObject {
    enum SessionState: Equatable {
        case checking
        case unauthenticated
        case authenticated
    }

    @Published var sessionState: SessionState = .checking
    @Published var email = ""
    @Published var password = ""
    @Published var keepSignedIn = true
    @Published var selectedMonth = MESCNativeAppModel.currentMonthString()
    @Published var isLoading = false
    @Published var errorMessage: String?
    @Published var user: MobileUserDTO?
    @Published var profile: MobileProfileDTO?
    @Published var profileImage: UIImage?
    @Published var activeCommunity: MobileCommunityDTO?
    @Published var missionHome: MobileMissionHomeDTO?
    @Published var scheduleMonth: MobileScheduleMonthDTO?
    @Published var scheduleEditor: MobileScheduleEditorDTO?
    @Published var questionnaireCurrent: MobileQuestionnaireCurrentDTO?
    @Published var formationOverview: MobileFormationOverviewDTO?
    @Published var formationLessonDetail: MobileFormationLessonDetailDTO?
    @Published var formationAdminStudio: MobileFormationAdminStudioDTO?
    @Published var formationCertificates: [MobileFormationCertificateDTO] = []
    @Published var formationLibraryMaterials: [MobileFormationMaterialDTO] = []
    @Published var coordinatorHome: MobileCoordinatorCommunityHomeDTO?
    @Published var coordinatorReadiness: MobileCoordinatorScheduleReadinessDTO?
    @Published var coordinatorMinisters: [MobileCoordinatorMinisterDTO] = []
    @Published var coordinatorQuestionnaireResponses: MobileCoordinatorQuestionnaireResponsesDTO?
    @Published var coordinatorSchedulePreview: MobileCoordinatorSchedulePreviewDTO?
    @Published var directoryMinisters: [MobileDirectoryMinisterDTO] = []
    @Published var isSavingQuestionnaire = false
    @Published var isLoadingFormationOverview = false
    @Published var isLoadingFormationResources = false
    @Published var isLoadingFormationLesson = false
    @Published var isDownloadingFormationFile = false
    @Published var isCompletingFormationLesson = false
    @Published var completingFormationSectionId: String?
    @Published var isLoadingFormationStudio = false
    @Published var isSavingFormationContent = false
    @Published var isLoadingCoordinator = false
    @Published var isLoadingCoordinatorQuestionnaire = false
    @Published var isMutatingCoordinatorQuestionnaire = false
    @Published var isLoadingDirectory = false
    @Published var isGeneratingCoordinatorPreview = false
    @Published var isPublishingCoordinatorSchedule = false
    @Published var questionnaireMessage: String?
    @Published var formationMessage: String?
    @Published var coordinatorMessage: String?
    @Published var directoryMessage: String?
    @Published var scheduleActionMessage: String?
    @Published var isMutatingSchedule = false
    @Published var isLoadingScheduleEditor = false
    @Published var isSavingScheduleEditor = false
    @Published var scheduleEditorMessage: String?
    @Published var substitutions: [MobileSubstitutionDTO] = []
    @Published var isLoadingSubstitutions = false
    @Published var substitutionMessage: String?
    @Published var isSubstitutionCenterPresentationRequested = false
    @Published var isSavingProfile = false
    @Published var isUpdatingProfilePhoto = false
    @Published var profileMessage: String?
    @Published var isUsingFallbackData = false
    @Published var pushAuthorizationStatus: UNAuthorizationStatus = .notDetermined
    @Published var pushPermissionMessage: String?
    @Published var currentDevice: MobileDeviceDTO?
    @Published var notificationPreferences = MESCNotificationPreference.defaults
    @Published var notifications: [MobileNotificationDTO] = []
    @Published var unreadNotificationsCount = 0
    @Published var isLoadingNotifications = false
    @Published var isMarkingAllNotificationsRead = false
    @Published var markingNotificationId: String?
    @Published var notificationMessage: String?
    @Published var isNotificationCenterPresented = false
    @Published var pendingNotificationDeepLink: String?
    @Published var isQuestionnairePresentationRequested = false
    @Published var biometricAvailable = false
    @Published var biometricEnabled = false
    @Published var biometricTypeLabel = "Face ID ou Touch ID"
    @Published var settingsMessage: String?
    @Published var isUpdatingSettings = false

    private let client = MESCMobileAPIClient()
    private let sessionStore = MESCNativeSessionStore()
    private var notificationObservers: [NSObjectProtocol] = []
    private var directoryPhotos: [String: UIImage] = [:]

    init() {
        notificationObservers.append(
            NotificationCenter.default.addObserver(
                forName: .mescRemoteNotificationDeviceToken,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                guard let token = notification.object as? String, !token.isEmpty else { return }
                Task { @MainActor [weak self] in
                    await self?.handleRemoteNotificationToken(token)
                }
            }
        )
        notificationObservers.append(
            NotificationCenter.default.addObserver(
                forName: .mescRemoteNotificationOpened,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                guard let deepLink = notification.object as? String, deepLink.hasPrefix("/") else { return }
                Task { @MainActor [weak self] in
                    self?.pendingNotificationDeepLink = deepLink
                }
            }
        )

        if let deepLink = UserDefaults.standard.string(forKey: Notification.Name.mescRemoteNotificationDeepLinkStorageKey), deepLink.hasPrefix("/") {
            pendingNotificationDeepLink = deepLink
        }
        notificationObservers.append(
            NotificationCenter.default.addObserver(
                forName: .mescRemoteNotificationRegistrationFailed,
                object: nil,
                queue: .main
            ) { [weak self] notification in
                let message = (notification.object as? String) ?? "Falha ao registrar notificações remotas."
                Task { @MainActor [weak self] in
                    await self?.handleRemoteNotificationRegistrationFailure(message)
                }
            }
        )
    }

    deinit {
        notificationObservers.forEach(NotificationCenter.default.removeObserver)
    }

    var firstName: String {
        guard let name = user?.name, !name.isEmpty else { return "ministro" }
        return name.split(separator: " ").first.map(String.init) ?? name
    }

    var currentMonthLabel: String {
        let month = scheduleMonth?.month ?? missionHome?.monthlySummary.month ?? selectedMonth
        return Self.monthLabel(from: month)
    }

    var currentMonthStartDate: Date {
        let month = scheduleMonth?.month ?? missionHome?.monthlySummary.month ?? selectedMonth
        return Self.monthStartDate(from: month) ?? ScheduleFixtures.monthDate
    }

    var activeQuestionnaire: MobileQuestionnaireDTO? {
        questionnaireCurrent?.questionnaire
    }

    var pushAuthorizationGranted: Bool {
        switch pushAuthorizationStatus {
        case .authorized, .provisional, .ephemeral:
            return true
        default:
            return false
        }
    }

    var pushEnabled: Bool {
        pushAuthorizationGranted
    }

    var pushLinkedToServer: Bool {
        pushAuthorizationGranted
            && currentDevice?.pushEnabled == true
            && currentDevice?.pushProvider == "apns"
    }

    var pushStatusText: String {
        switch pushAuthorizationStatus {
        case .authorized:
            if pushLinkedToServer {
                return "Ativas e vinculadas"
            }
            if sessionStore.remotePushToken != nil {
                return "Sincronizando com o MESC"
            }
            return "Permissão ativa no iPhone"
        case .provisional:
            return "Ativas silenciosamente"
        case .ephemeral:
            return "Ativas temporariamente"
        case .denied:
            return "Bloqueadas nos Ajustes do iPhone"
        case .notDetermined:
            return "Toque para permitir"
        @unknown default:
            return "Status desconhecido"
        }
    }

    var pushConnectionText: String {
        let iosState = pushAuthorizationGranted ? "iOS ativo" : "iOS pendente"
        let serverState = pushLinkedToServer ? "MESC vinculado" : "MESC pendente"
        return "\(iosState) • \(serverState)"
    }

    var pushActionTitle: String {
        switch pushAuthorizationStatus {
        case .denied:
            return "Abrir Ajustes"
        case .notDetermined:
            return "Permitir"
        default:
            return pushLinkedToServer ? "Revalidar" : "Vincular"
        }
    }

    var pushPermissionDetail: String {
        switch pushAuthorizationStatus {
        case .denied:
            return "O iOS bloqueou as notificações. Abra os Ajustes do iPhone para permitir novamente."
        case .notDetermined:
            return "Receba escala, questionário, substituições e avisos sem depender do navegador."
        default:
            return "Permissão nativa do iPhone com entrega pelo cadastro seguro deste aparelho."
        }
    }

    var canManageFormation: Bool {
        canManageCommunity
    }

    var canManageCommunity: Bool {
        let role = user?.role.lowercased() ?? ""
        return role == "gestor" || role == "reitor" || role == "coordenador" || role.hasPrefix("coordenador_")
    }

    var formationVideoLessons: [MobileFormationLessonDTO] {
        formationOverview?.tracks.flatMap { track in
            track.modules.flatMap { module in
                module.lessons.filter { lesson in
                    guard let videoUrl = lesson.videoUrl else { return false }
                    return !videoUrl.isEmpty
                }
            }
        } ?? []
    }

    func restoreSessionIfNeeded() async {
        guard sessionState == .checking else { return }

        // A clean install has no session to restore. Keep the launch path limited to
        // the login UI and defer device permission probes until after authentication.
        let hasStoredAccessToken = sessionStore.accessToken != nil
        let hasStoredRefreshToken = sessionStore.refreshToken != nil
        guard hasStoredAccessToken || hasStoredRefreshToken else {
            sessionState = .unauthenticated
            return
        }

        await refreshDevicePermissions()

        if !hasStoredAccessToken {
            if await refreshSession() {
                do {
                    try await loadHomeAndSchedules()
                    sessionState = .authenticated
                    return
                } catch {
                    errorMessage = MESCMobileAPIClient.userMessage(for: error)
                    isUsingFallbackData = true
                    sessionState = .authenticated
                    return
                }
            } else {
                sessionState = .unauthenticated
                return
            }
        }

        do {
            try await loadHomeAndSchedules()
            sessionState = .authenticated
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession() {
                do {
                    try await loadHomeAndSchedules()
                    sessionState = .authenticated
                    return
                } catch {
                    handleSessionFailure(error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                errorMessage = MESCMobileAPIClient.userMessage(for: error)
                isUsingFallbackData = true
                sessionState = .authenticated
            }
        }
    }

    func signIn() async {
        let trimmedEmail = email.trimmingCharacters(in: .whitespacesAndNewlines)
        guard !trimmedEmail.isEmpty, !password.isEmpty else {
            errorMessage = "Informe e-mail e senha."
            return
        }

        isLoading = true
        errorMessage = nil
        isUsingFallbackData = false

        do {
            let response = try await client.login(
                email: trimmedEmail,
                password: password,
                keepSignedIn: keepSignedIn,
                deviceId: sessionStore.deviceId,
                appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String
            )
            persist(authResponse: response)
            user = response.user
            activeCommunity = response.communities.first(where: { $0.id == response.activeCommunityId }) ?? response.communities.first
            try await loadHomeAndSchedules()
            sessionState = .authenticated
            password = ""
        } catch {
            errorMessage = MESCMobileAPIClient.userMessage(for: error)
            sessionState = .unauthenticated
        }

        isLoading = false
    }

    func reload() async {
        isLoading = true
        errorMessage = nil

        do {
            try await loadHomeAndSchedules()
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession() {
                do {
                    try await loadHomeAndSchedules()
                } catch {
                    errorMessage = MESCMobileAPIClient.userMessage(for: error)
                    isUsingFallbackData = true
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                errorMessage = MESCMobileAPIClient.userMessage(for: error)
                isUsingFallbackData = true
            }
        }

        isLoading = false
    }

    func signOut() {
        sessionStore.clearTokens()
        user = nil
        profile = nil
        profileImage = nil
        activeCommunity = nil
        missionHome = nil
        scheduleMonth = nil
        scheduleEditor = nil
        questionnaireCurrent = nil
        formationOverview = nil
        formationLessonDetail = nil
        formationAdminStudio = nil
        formationCertificates = []
        formationLibraryMaterials = []
        coordinatorHome = nil
        coordinatorReadiness = nil
        coordinatorMinisters = []
        coordinatorQuestionnaireResponses = nil
        coordinatorSchedulePreview = nil
        directoryMinisters = []
        directoryPhotos = [:]
        questionnaireMessage = nil
        formationMessage = nil
        coordinatorMessage = nil
        directoryMessage = nil
        scheduleActionMessage = nil
        settingsMessage = nil
        currentDevice = nil
        notifications = []
        unreadNotificationsCount = 0
        notificationMessage = nil
        isNotificationCenterPresented = false
        substitutions = []
        substitutionMessage = nil
        isSubstitutionCenterPresentationRequested = false
        profileMessage = nil
        isQuestionnairePresentationRequested = false
        pendingNotificationDeepLink = nil
        UserDefaults.standard.removeObject(forKey: Notification.Name.mescRemoteNotificationDeepLinkStorageKey)
        errorMessage = nil
        isUsingFallbackData = false
        selectedMonth = Self.currentMonthString()
        sessionState = .unauthenticated
    }

    func refreshDevicePermissions() async {
        let settings = await UNUserNotificationCenter.current().notificationSettings()
        pushAuthorizationStatus = settings.authorizationStatus
        refreshBiometricCapability()
    }

    func refreshNativeNotificationState() async {
        await refreshDevicePermissions()

        guard sessionState == .authenticated else { return }

        if pushAuthorizationGranted {
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
            await syncStoredRemotePushTokenIfNeeded()
        } else if currentDevice?.pushEnabled == true {
            await updateCurrentDevice(pushEnabled: false)
        }
    }

    func requestPushNotifications() async {
        pushPermissionMessage = nil
        await refreshDevicePermissions()

        if pushAuthorizationStatus == .denied {
            pushPermissionMessage = "Ative as notificações em Ajustes do iPhone para receber avisos do MESC."
            openSystemSettings()
            return
        }

        if pushAuthorizationGranted {
            await MainActor.run {
                UIApplication.shared.registerForRemoteNotifications()
            }
            if let token = sessionStore.remotePushToken {
                await updateCurrentDevice(
                    pushToken: token,
                    pushProvider: "apns",
                    pushEnabled: true
                )
                pushPermissionMessage = "Notificações nativas vinculadas a este iPhone."
            } else {
                pushPermissionMessage = "Permissão ativa. Finalizando o vínculo seguro deste iPhone."
            }
            return
        }

        do {
            let granted = try await UNUserNotificationCenter.current().requestAuthorization(options: [.alert, .badge, .sound])
            await refreshDevicePermissions()
            if granted {
                await MainActor.run {
                    UIApplication.shared.registerForRemoteNotifications()
                }
                if let token = sessionStore.remotePushToken {
                    await updateCurrentDevice(
                        pushToken: token,
                        pushProvider: "apns",
                        pushEnabled: true
                    )
                    pushPermissionMessage = "Notificações nativas vinculadas a este iPhone."
                } else {
                    pushPermissionMessage = "Permissão concedida. Finalizando o vínculo seguro deste iPhone."
                }
            } else {
                pushPermissionMessage = "Permissão não concedida. Você pode habilitar em Ajustes do iPhone."
                await updateCurrentDevice(pushEnabled: false)
            }
        } catch {
            pushPermissionMessage = "Não foi possível solicitar notificações agora."
        }
    }

    func openSystemSettings() {
        guard let url = URL(string: UIApplication.openSettingsURLString) else { return }
        UIApplication.shared.open(url)
    }

    func scheduleDays(for mode: ScheduleMode) -> [ScheduleDay] {
        guard let scheduleMonth else { return ScheduleFixtures.days }

        let startDate = Self.monthStartDate(from: scheduleMonth.month) ?? ScheduleFixtures.monthDate
        let dayRange = Calendar.current.range(of: .day, in: .month, for: startDate) ?? 1..<32

        let publicMissions = buildPublicScheduleMissions(
            from: scheduleMonth.publicSchedule.assignments,
            ownSchedules: scheduleMonth.schedules
        )
        let visibleMissions: [ScheduleMission]
        switch mode {
        case .mine:
            visibleMissions = publicMissions.filter(\.isCurrentUser)
        case .month, .full:
            visibleMissions = publicMissions
        }
        let missionsByDay = Dictionary(grouping: visibleMissions, by: \.dayNumber)
            .mapValues { $0.sorted { $0.time < $1.time } }

        return dayRange.compactMap { day -> ScheduleDay? in
            guard let date = Calendar.current.date(byAdding: .day, value: day - 1, to: startDate) else { return nil }
            return ScheduleDay(
                id: day,
                dayNumber: day,
                date: date,
                missions: missionsByDay[day] ?? []
            )
        }
    }

    func submitQuestionnaire(
        answers: [MobileQuestionnaireAnswerDTO],
        sharedWithFamilyIds: [String] = []
    ) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        guard let questionnaire = activeQuestionnaire else {
            questionnaireMessage = "Nenhum questionário publicado para responder."
            return false
        }

        isSavingQuestionnaire = true
        questionnaireMessage = nil

        do {
            _ = try await client.submitQuestionnaire(
                questionnaireId: questionnaire.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                responses: answers,
                sharedWithFamilyIds: sharedWithFamilyIds
            )
            questionnaireMessage = "Resposta salva com sucesso."
            try await loadCurrentQuestionnaire(accessToken: accessToken)
            isSavingQuestionnaire = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    _ = try await client.submitQuestionnaire(
                        questionnaireId: questionnaire.id,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: UUID().uuidString,
                        responses: answers,
                        sharedWithFamilyIds: sharedWithFamilyIds
                    )
                    questionnaireMessage = "Resposta salva com sucesso."
                    try await loadCurrentQuestionnaire(accessToken: accessToken)
                    isSavingQuestionnaire = false
                    return true
                } catch {
                    questionnaireMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else {
                questionnaireMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isSavingQuestionnaire = false
        return false
    }

    func loadNotifications() async {
        guard let accessToken = sessionStore.accessToken else {
            return
        }

        isLoadingNotifications = true
        notificationMessage = nil

        do {
            try await loadNotifications(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await loadNotifications(accessToken: refreshedAccessToken)
                } catch {
                    notificationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                notificationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingNotifications = false
    }

    @discardableResult
    func markNotificationRead(_ notification: MobileNotificationDTO) async -> Bool {
        guard !notification.read else { return true }
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        markingNotificationId = notification.id
        notificationMessage = nil

        do {
            let response = try await client.markNotificationRead(
                notificationId: notification.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            applyNotificationRead(response.notification)
            markingNotificationId = nil
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    let response = try await client.markNotificationRead(
                        notificationId: notification.id,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    applyNotificationRead(response.notification)
                    markingNotificationId = nil
                    return true
                } catch {
                    notificationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                notificationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        markingNotificationId = nil
        return false
    }

    @discardableResult
    func markAllNotificationsRead() async -> Bool {
        guard unreadNotificationsCount > 0 else { return true }
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isMarkingAllNotificationsRead = true
        notificationMessage = nil

        do {
            _ = try await client.markAllNotificationsRead(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            applyAllNotificationsRead()
            isMarkingAllNotificationsRead = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    _ = try await client.markAllNotificationsRead(
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    applyAllNotificationsRead()
                    isMarkingAllNotificationsRead = false
                    return true
                } catch {
                    notificationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                notificationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isMarkingAllNotificationsRead = false
        return false
    }

    func confirmSchedule(scheduleId: String) async -> Bool {
        await mutateSchedule(messageOnSuccess: "Presença confirmada com sucesso.") { accessToken in
            _ = try await self.client.confirmSchedule(
                scheduleId: scheduleId,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                status: "confirmed",
                notes: nil
            )
        }
    }

    func requestSubstitution(scheduleId: String, reason: String?) async -> Bool {
        let requested = await mutateSchedule(messageOnSuccess: "Pedido de substituição publicado.") { accessToken in
            _ = try await self.client.requestSubstitution(
                scheduleId: scheduleId,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                reason: reason
            )
        }

        if requested {
            await loadSubstitutions()
        }

        return requested
    }

    func loadSubstitutions() async {
        guard let accessToken = sessionStore.accessToken else { return }

        isLoadingSubstitutions = true
        substitutionMessage = nil

        do {
            try await loadSubstitutions(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await loadSubstitutions(accessToken: refreshedAccessToken)
                } catch {
                    substitutionMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                substitutionMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingSubstitutions = false
    }

    func claimSubstitution(id: String, message: String?) async -> Bool {
        let claimed = await mutateSchedule(messageOnSuccess: "Substituição confirmada. A escala foi atualizada.") { accessToken in
            _ = try await self.client.claimSubstitution(
                substitutionId: id,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: UUID().uuidString,
                message: message
            )
        }

        if claimed {
            await loadSubstitutions()
        }

        return claimed
    }

    @discardableResult
    func saveProfile(
        name: String,
        phone: String,
        whatsapp: String,
        scheduleDisplayName: String,
        ministryStartDate: Date?,
        maritalStatus: String
    ) async -> Bool {
        let trimmedName = name.trimmingCharacters(in: .whitespacesAndNewlines)
        guard trimmedName.count >= 3 else {
            profileMessage = "Informe seu nome completo para atualizar o cadastro."
            return false
        }

        return await mutateProfile(messageOnSuccess: "Dados do perfil atualizados.") { accessToken, idempotencyKey in
            _ = try await self.client.updateProfile(
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey,
                body: ProfileUpdateRequestBody(
                    name: trimmedName,
                    phone: Self.optionalText(phone),
                    whatsapp: Self.optionalText(whatsapp),
                    scheduleDisplayName: Self.optionalText(scheduleDisplayName),
                    ministryStartDate: ministryStartDate.map(Self.profileDateString),
                    maritalStatus: Self.optionalText(maritalStatus)
                )
            )
        }
    }

    @discardableResult
    func uploadProfilePhoto(_ image: UIImage) async -> Bool {
        guard let imageData = MESCProfileImageEncoder.jpegData(from: image) else {
            profileMessage = "Não foi possível preparar esta foto. Tente outra imagem."
            return false
        }

        isUpdatingProfilePhoto = true
        let uploaded = await mutateProfile(messageOnSuccess: "Foto de perfil atualizada.") { accessToken, idempotencyKey in
            _ = try await self.client.uploadProfilePhoto(
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey,
                imageBase64: imageData.base64EncodedString(),
                contentType: "image/jpeg"
            )
        }
        isUpdatingProfilePhoto = false
        return uploaded
    }

    @discardableResult
    func removeProfilePhoto() async -> Bool {
        isUpdatingProfilePhoto = true
        let removed = await mutateProfile(messageOnSuccess: "Foto de perfil removida.") { accessToken, idempotencyKey in
            _ = try await self.client.removeProfilePhoto(
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
        }
        isUpdatingProfilePhoto = false
        return removed
    }

    func createOfficialScheduleExport() throws -> URL {
        guard let scheduleMonth else {
            throw MESCMobileAPIError.server(status: 400, message: "Escala do mês ainda não carregada.")
        }

        let html = Self.officialScheduleHTML(
            monthLabel: currentMonthLabel,
            monthKey: scheduleMonth.month,
            communityName: scheduleMonth.community.name,
            assignments: scheduleMonth.publicSchedule.assignments
        )
        let fileName = "Escala-\(scheduleMonth.month)-MESC.html"
        let url = FileManager.default.temporaryDirectory.appendingPathComponent(fileName)
        try html.write(to: url, atomically: true, encoding: .utf8)
        return url
    }

    func loadScheduleEditor(scheduleId: String) async {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return
        }

        isLoadingScheduleEditor = true
        scheduleEditor = nil
        scheduleEditorMessage = nil
        do {
            scheduleEditor = try await client.scheduleEditor(
                scheduleId: scheduleId,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    scheduleEditor = try await client.scheduleEditor(
                        scheduleId: scheduleId,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                } catch {
                    scheduleEditorMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                scheduleEditorMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }
        isLoadingScheduleEditor = false
    }

    func updateScheduleAssignment(scheduleId: String, ministerId: String?) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isSavingScheduleEditor = true
        scheduleEditorMessage = nil
        let idempotencyKey = UUID().uuidString
        do {
            _ = try await client.updateScheduleAssignment(
                scheduleId: scheduleId,
                ministerId: ministerId,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
            await reload()
            scheduleEditorMessage = "Escala atualizada."
            isSavingScheduleEditor = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    _ = try await client.updateScheduleAssignment(
                        scheduleId: scheduleId,
                        ministerId: ministerId,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: idempotencyKey
                    )
                    await reload()
                    scheduleEditorMessage = "Escala atualizada."
                    isSavingScheduleEditor = false
                    return true
                } catch {
                    scheduleEditorMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                scheduleEditorMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }
        isSavingScheduleEditor = false
        return false
    }

    func shiftScheduleMonth(by monthDelta: Int) async {
        guard let currentStart = Self.monthStartDate(from: selectedMonth),
              let nextStart = Calendar.current.date(byAdding: .month, value: monthDelta, to: currentStart)
        else {
            return
        }

        selectedMonth = Self.monthString(from: nextStart)
        isLoading = true
        errorMessage = nil

        do {
            try await loadHomeAndSchedules()
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession() {
                do {
                    try await loadHomeAndSchedules()
                } catch {
                    errorMessage = MESCMobileAPIClient.userMessage(for: error)
                    isUsingFallbackData = true
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                errorMessage = MESCMobileAPIClient.userMessage(for: error)
                isUsingFallbackData = true
            }
        }

        isLoading = false
    }

    func openFormationLesson(_ lesson: MobileFormationLessonDTO) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        guard let trackId = resolvedTrackId(for: lesson) else {
            formationMessage = "Não foi possível localizar a trilha desta aula."
            return false
        }

        isLoadingFormationLesson = true
        formationMessage = nil

        do {
            formationLessonDetail = try await client.formationLesson(
                trackId: trackId,
                moduleId: lesson.moduleId,
                lessonNumber: lesson.lessonNumber,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            isLoadingFormationLesson = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    formationLessonDetail = try await client.formationLesson(
                        trackId: trackId,
                        moduleId: lesson.moduleId,
                        lessonNumber: lesson.lessonNumber,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    isLoadingFormationLesson = false
                    return true
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingFormationLesson = false
        return false
    }

    func setBiometricPreference(_ enabled: Bool) async {
        settingsMessage = nil
        refreshBiometricCapability()

        guard biometricAvailable || !enabled else {
            biometricEnabled = false
            settingsMessage = "Este aparelho não possui biometria disponível."
            return
        }

        let previous = biometricEnabled
        biometricEnabled = enabled
        let success = await updateCurrentDevice(biometricCapable: biometricAvailable, biometricEnabled: enabled)
        if success {
            settingsMessage = enabled ? "\(biometricTypeLabel) registrado neste aparelho." : "Biometria desativada neste aparelho."
        } else {
            biometricEnabled = previous
        }
    }

    func setNotificationPreference(key: String, enabled: Bool) async {
        guard MESCNotificationPreference.options.contains(where: { $0.key == key }) else { return }

        settingsMessage = nil
        var next = notificationPreferences
        let previous = notificationPreferences
        next[key] = enabled
        notificationPreferences = next

        let success = await updateCurrentDevice(notificationPreferences: next)
        if success {
            settingsMessage = "Preferências atualizadas."
        } else {
            notificationPreferences = previous
        }
    }

    func completeCurrentFormationLesson() async -> Bool {
        guard let detail = formationLessonDetail else {
            formationMessage = "Abra uma aula antes de concluir."
            return false
        }

        guard completingFormationSectionId == nil else {
            formationMessage = "Aguarde a conclusão da seção em andamento."
            return false
        }

        guard detail.progress.status != "completed" else {
            formationMessage = "Aula já concluída."
            return true
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isCompletingFormationLesson = true
        formationMessage = nil

        do {
            let response = try await client.completeFormationLesson(
                lessonId: detail.lesson.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: UUID().uuidString
            )
            formationLessonDetail = detail.withProgress(response.progress)
            await refreshFormationOverviewAfterProgress(accessToken: accessToken)
            if response.certificate != nil {
                await refreshFormationResources()
            }
            formationMessage = response.certificate == nil
                ? "Aula concluída com sucesso."
                : "Aula concluída. Seu certificado já está disponível."
            isCompletingFormationLesson = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    let response = try await client.completeFormationLesson(
                        lessonId: detail.lesson.id,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: UUID().uuidString
                    )
                    formationLessonDetail = detail.withProgress(response.progress)
                    await refreshFormationOverviewAfterProgress(accessToken: accessToken)
                    if response.certificate != nil {
                        await refreshFormationResources()
                    }
                    formationMessage = response.certificate == nil
                        ? "Aula concluída com sucesso."
                        : "Aula concluída. Seu certificado já está disponível."
                    isCompletingFormationLesson = false
                    return true
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isCompletingFormationLesson = false
        return false
    }

    func completeFormationLessonSection(sectionId: String) async -> Bool {
        guard let detail = formationLessonDetail else {
            formationMessage = "Abra uma aula antes de concluir."
            return false
        }

        guard !isCompletingFormationLesson, completingFormationSectionId == nil else {
            formationMessage = "Aguarde a conclusão em andamento."
            return false
        }

        guard detail.progress.completedSections?.contains(sectionId) != true else {
            formationMessage = "Seção já concluída."
            return true
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        completingFormationSectionId = sectionId
        formationMessage = nil

        do {
            let response = try await client.completeFormationLessonSection(
                lessonId: detail.lesson.id,
                sectionId: sectionId,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: UUID().uuidString
            )
            formationLessonDetail = detail.withProgress(response.progress)
            await refreshFormationOverviewAfterProgress(accessToken: accessToken)
            if response.certificate != nil {
                await refreshFormationResources()
            }
            formationMessage = response.certificate != nil
                ? "Aula concluída. Seu certificado já está disponível."
                : (response.progress.status == "completed" ? "Aula concluída com sucesso." : "Seção concluída.")
            completingFormationSectionId = nil
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    let response = try await client.completeFormationLessonSection(
                        lessonId: detail.lesson.id,
                        sectionId: sectionId,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: UUID().uuidString
                    )
                    formationLessonDetail = detail.withProgress(response.progress)
                    await refreshFormationOverviewAfterProgress(accessToken: accessToken)
                    if response.certificate != nil {
                        await refreshFormationResources()
                    }
                    formationMessage = response.certificate != nil
                        ? "Aula concluída. Seu certificado já está disponível."
                        : (response.progress.status == "completed" ? "Aula concluída com sucesso." : "Seção concluída.")
                    completingFormationSectionId = nil
                    return true
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        completingFormationSectionId = nil
        return false
    }

    func loadFormationAdminStudio() async {
        guard canManageFormation else {
            formationMessage = "Apenas gestores e coordenadores podem editar formação."
            return
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return
        }

        isLoadingFormationStudio = true
        formationMessage = nil

        do {
            let response = try await client.formationAdminStudio(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            formationAdminStudio = response.studio
            isLoadingFormationStudio = false
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    let response = try await client.formationAdminStudio(
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    formationAdminStudio = response.studio
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }

            isLoadingFormationStudio = false
        }
    }

    func refreshFormation() async {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return
        }

        isLoadingFormationOverview = true
        formationMessage = nil

        do {
            try await loadFormationOverview(accessToken: accessToken)
            await refreshFormationResources()
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await loadFormationOverview(accessToken: refreshedAccessToken)
                    await refreshFormationResources()
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingFormationOverview = false
    }

    func refreshFormationResources() async {
        guard let accessToken = sessionStore.accessToken else {
            return
        }

        isLoadingFormationResources = true

        do {
            try await loadFormationResources(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await loadFormationResources(accessToken: refreshedAccessToken)
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingFormationResources = false
    }

    func downloadFormationMaterial(_ material: MobileFormationMaterialDTO) async -> URL? {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return nil
        }

        isDownloadingFormationFile = true
        formationMessage = nil
        defer { isDownloadingFormationFile = false }

        do {
            let data = try await client.formationMaterialDownload(
                materialId: material.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            return try writeFormationFile(data, fileName: material.fileName)
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    let data = try await client.formationMaterialDownload(
                        materialId: material.id,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    return try writeFormationFile(data, fileName: material.fileName)
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        return nil
    }

    func downloadFormationCertificate(_ certificate: MobileFormationCertificateDTO) async -> URL? {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return nil
        }

        isDownloadingFormationFile = true
        formationMessage = nil
        defer { isDownloadingFormationFile = false }

        do {
            let data = try await client.formationCertificatePDF(
                certificateId: certificate.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            return try writeFormationFile(data, fileName: "certificado-\(certificate.certificateNumber).pdf")
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    let data = try await client.formationCertificatePDF(
                        certificateId: certificate.id,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    return try writeFormationFile(data, fileName: "certificado-\(certificate.certificateNumber).pdf")
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        return nil
    }

    func createFormationAdminLesson(_ payload: FormationAdminLessonRequestBody) async -> Bool {
        guard canManageFormation else {
            formationMessage = "Apenas gestores e coordenadores podem editar formação."
            return false
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isSavingFormationContent = true
        formationMessage = nil

        do {
            _ = try await client.createFormationAdminLesson(
                payload: payload,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: UUID().uuidString
            )
            try await loadFormationOverview(accessToken: accessToken)
            await loadFormationAdminStudio()
            formationMessage = payload.isActive == false ? "Aula salva como rascunho." : "Aula publicada com sucesso."
            isSavingFormationContent = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    _ = try await client.createFormationAdminLesson(
                        payload: payload,
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: UUID().uuidString
                    )
                    try await loadFormationOverview(accessToken: accessToken)
                    await loadFormationAdminStudio()
                    formationMessage = payload.isActive == false ? "Aula salva como rascunho." : "Aula publicada com sucesso."
                    isSavingFormationContent = false
                    return true
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isSavingFormationContent = false
        return false
    }

    func updateFormationAdminLesson(
        lessonId: String,
        payload: FormationAdminLessonUpdateRequestBody
    ) async -> Bool {
        await persistFormationContent(successMessage: "Aula atualizada com sucesso.") { accessToken, idempotencyKey in
            _ = try await self.client.updateFormationAdminLesson(
                lessonId: lessonId,
                payload: payload,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
        }
    }

    func createFormationAdminLessonSection(
        lessonId: String,
        payload: FormationAdminSectionRequestBody
    ) async -> Bool {
        await persistFormationContent(successMessage: "Conteúdo adicionado à aula.") { accessToken, idempotencyKey in
            _ = try await self.client.createFormationAdminLessonSection(
                lessonId: lessonId,
                payload: payload,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
        }
    }

    func createFormationAdminMaterial(_ payload: FormationAdminMaterialRequestBody) async -> Bool {
        await persistFormationContent(
            successMessage: payload.isPublished == false ? "Material salvo como rascunho." : "Material publicado na biblioteca.",
            refreshResources: true
        ) { accessToken, idempotencyKey in
            _ = try await self.client.createFormationAdminMaterial(
                payload: payload,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
        }
    }

    private func persistFormationContent(
        successMessage: String,
        refreshResources: Bool = false,
        operation: @escaping (String, String) async throws -> Void
    ) async -> Bool {
        guard canManageFormation else {
            formationMessage = "Apenas gestores e coordenadores podem editar formação."
            return false
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        let idempotencyKey = UUID().uuidString
        isSavingFormationContent = true
        formationMessage = nil

        do {
            try await operation(accessToken, idempotencyKey)
            await refreshFormationOverviewAfterProgress(accessToken: accessToken)
            if refreshResources {
                await refreshFormationResources()
            }
            await loadFormationAdminStudio()
            formationMessage = successMessage
            isSavingFormationContent = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await operation(refreshedAccessToken, idempotencyKey)
                    await refreshFormationOverviewAfterProgress(accessToken: refreshedAccessToken)
                    if refreshResources {
                        await refreshFormationResources()
                    }
                    await loadFormationAdminStudio()
                    formationMessage = successMessage
                    isSavingFormationContent = false
                    return true
                } catch {
                    formationMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                formationMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isSavingFormationContent = false
        return false
    }

    func loadDirectory() async {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return
        }

        isLoadingDirectory = true
        directoryMessage = nil

        do {
            let response = try await client.directoryMinisters(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            directoryMinisters = response.ministers
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    let response = try await client.directoryMinisters(
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                    directoryMinisters = response.ministers
                } catch {
                    directoryMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                directoryMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingDirectory = false
    }

    func directoryPhoto(for minister: MobileDirectoryMinisterDTO) async -> UIImage? {
        guard minister.photoAvailable else { return nil }
        if let cached = directoryPhotos[minister.id] {
            return cached
        }
        guard let accessToken = sessionStore.accessToken else { return nil }

        do {
            let data = try await client.directoryMinisterPhoto(
                ministerId: minister.id,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            let image = UIImage(data: data)
            if let image {
                directoryPhotos[minister.id] = image
            }
            return image
        } catch {
            return nil
        }
    }

    func refreshCoordinator() async {
        guard canManageCommunity else {
            coordinatorMessage = "Acesso restrito à coordenação."
            return
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return
        }

        isLoadingCoordinator = true
        coordinatorMessage = nil

        do {
            try await loadCoordinatorPayloads(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await loadCoordinatorPayloads(accessToken: refreshedAccessToken)
                } catch {
                    coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingCoordinator = false
    }

    func loadCoordinatorQuestionnaireResponses() async {
        guard let questionnaireId = coordinatorHome?.questionnaire?.id else {
            coordinatorMessage = "Não há questionário publicado para esta comunidade neste mês."
            return
        }

        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return
        }

        isLoadingCoordinatorQuestionnaire = true
        coordinatorMessage = nil

        do {
            coordinatorQuestionnaireResponses = try await client.coordinatorQuestionnaireResponses(
                questionnaireId: questionnaireId,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    coordinatorQuestionnaireResponses = try await client.coordinatorQuestionnaireResponses(
                        questionnaireId: questionnaireId,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId
                    )
                } catch {
                    coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isLoadingCoordinatorQuestionnaire = false
    }

    func createCoordinatorQuestionnaire(
        month: Date,
        title: String,
        description: String,
        deadline: Date
    ) async -> Bool {
        let calendar = Calendar(identifier: .gregorian)
        let components = calendar.dateComponents([.year, .month], from: month)
        guard let selectedYear = components.year, let selectedMonth = components.month else {
            coordinatorMessage = "Não foi possível definir o mês do questionário."
            return false
        }

        let created = await mutateCoordinatorQuestionnaire { accessToken, idempotencyKey in
            let response = try await self.client.createCoordinatorQuestionnaire(
                month: selectedMonth,
                year: selectedYear,
                title: title.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : title,
                description: description.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : description,
                deadline: ISO8601DateFormatter().string(from: deadline),
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
            let monthValue = String(format: "%04d-%02d", selectedYear, selectedMonth)
            return "Questionário criado para \(MESCNativeAppModel.monthLabel(from: monthValue)). \(response.questionnaire.targetCount) ministro(s) serão convidados ao publicar."
        }

        if created {
            self.selectedMonth = String(format: "%04d-%02d", selectedYear, selectedMonth)
            await refreshCoordinator()
        }

        return created
    }

    func publishCoordinatorQuestionnaire(questionnaireId: String) async -> Bool {
        await mutateCoordinatorQuestionnaire { accessToken, idempotencyKey in
            let response = try await self.client.publishCoordinatorQuestionnaire(
                questionnaireId: questionnaireId,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
            return "Questionário publicado e \(response.notificationsQueued ?? 0) aviso(s) preparado(s)."
        }
    }

    func closeCoordinatorQuestionnaire(questionnaireId: String) async -> Bool {
        await mutateCoordinatorQuestionnaire { accessToken, idempotencyKey in
            let response = try await self.client.closeCoordinatorQuestionnaire(
                questionnaireId: questionnaireId,
                accessToken: accessToken,
                communityId: self.sessionStore.activeCommunityId,
                deviceId: self.sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
            return "Questionário encerrado com \(response.questionnaire.responseCount) resposta(s)."
        }
    }

    private func mutateCoordinatorQuestionnaire(
        operation: @escaping (String, String) async throws -> String
    ) async -> Bool {
        guard canManageCommunity else {
            coordinatorMessage = "Acesso restrito à coordenação."
            return false
        }
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isMutatingCoordinatorQuestionnaire = true
        coordinatorMessage = nil
        let idempotencyKey = UUID().uuidString

        do {
            coordinatorMessage = try await operation(accessToken, idempotencyKey)
            await refreshCoordinator()
            isMutatingCoordinatorQuestionnaire = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    coordinatorMessage = try await operation(refreshedAccessToken, idempotencyKey)
                    await refreshCoordinator()
                    isMutatingCoordinatorQuestionnaire = false
                    return true
                } catch {
                    coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isMutatingCoordinatorQuestionnaire = false
        return false
    }

    func generateCoordinatorSchedulePreview() async {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return
        }

        isGeneratingCoordinatorPreview = true
        coordinatorMessage = nil
        let idempotencyKey = UUID().uuidString

        do {
            coordinatorSchedulePreview = try await client.coordinatorSchedulePreview(
                month: selectedMonth,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    coordinatorSchedulePreview = try await client.coordinatorSchedulePreview(
                        month: selectedMonth,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: idempotencyKey
                    )
                } catch {
                    coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isGeneratingCoordinatorPreview = false
    }

    func publishCoordinatorSchedule(replaceExisting: Bool) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isPublishingCoordinatorSchedule = true
        coordinatorMessage = nil
        let idempotencyKey = UUID().uuidString

        do {
            let response = try await client.publishCoordinatorSchedule(
                month: selectedMonth,
                replaceExisting: replaceExisting,
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                idempotencyKey: idempotencyKey
            )
            coordinatorMessage = "Escala publicada: \(response.summary.publishedAssignments) escalações e \(response.summary.notificationsQueued) aviso(s) preparados."
            coordinatorSchedulePreview = response.asPreview
            try? await loadHomeAndSchedules()
            await refreshCoordinator()
            isPublishingCoordinatorSchedule = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    let response = try await client.publishCoordinatorSchedule(
                        month: selectedMonth,
                        replaceExisting: replaceExisting,
                        accessToken: refreshedAccessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        idempotencyKey: idempotencyKey
                    )
                    coordinatorMessage = "Escala publicada: \(response.summary.publishedAssignments) escalações e \(response.summary.notificationsQueued) aviso(s) preparados."
                    coordinatorSchedulePreview = response.asPreview
                    try? await loadHomeAndSchedules()
                    await refreshCoordinator()
                    isPublishingCoordinatorSchedule = false
                    return true
                } catch {
                    coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                coordinatorMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isPublishingCoordinatorSchedule = false
        return false
    }

    private func loadCoordinatorPayloads(accessToken: String) async throws {
        async let home = client.coordinatorCommunityHome(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            month: selectedMonth
        )
        async let readiness = client.coordinatorScheduleReadiness(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            month: selectedMonth
        )
        async let ministers = client.coordinatorMinisters(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )

        let (homePayload, readinessPayload, ministersPayload) = try await (home, readiness, ministers)
        coordinatorHome = homePayload
        coordinatorReadiness = readinessPayload
        coordinatorMinisters = ministersPayload.ministers
    }

    private func loadHomeAndSchedules() async throws {
        guard let accessToken = sessionStore.accessToken else {
            throw MESCMobileAPIError.unauthenticated
        }

        let month = selectedMonth
        async let home = client.missionHome(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            month: month
        )
        async let schedules = client.scheduleMonth(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            month: month
        )

        let (homePayload, schedulesPayload) = try await (home, schedules)
        missionHome = homePayload
        scheduleMonth = schedulesPayload
        user = homePayload.user
        activeCommunity = homePayload.community
        sessionStore.activeCommunityId = homePayload.community.id
        isUsingFallbackData = false

        do {
            try await loadProfile(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }

        do {
            try await loadCurrentQuestionnaire(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }

        do {
            try await loadFormationOverview(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
            formationMessage = MESCMobileAPIClient.userMessage(for: error)
        }

        do {
            try await loadCurrentDevice(accessToken: accessToken)
            await syncStoredRemotePushTokenIfNeeded()
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }

        do {
            try await loadNotifications(accessToken: accessToken)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
        }
    }

    private func loadNotifications(accessToken: String) async throws {
        let response = try await client.notifications(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            limit: 60
        )
        notifications = response.notifications
        unreadNotificationsCount = response.unreadCount
    }

    private func loadProfile(accessToken: String) async throws {
        let response = try await client.profile(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        applyProfile(response.profile)

        guard response.profile.photoUrl != nil else {
            profileImage = nil
            return
        }

        do {
            let data = try await client.profilePhoto(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId
            )
            profileImage = UIImage(data: data)
        } catch {
            if Self.isAuthenticationFailure(error) {
                throw error
            }
            profileImage = nil
        }
    }

    private func applyProfile(_ updatedProfile: MobileProfileDTO) {
        profile = updatedProfile
        user = MobileUserDTO(
            id: updatedProfile.id,
            email: updatedProfile.email,
            name: updatedProfile.name,
            role: updatedProfile.role,
            homeCommunityId: updatedProfile.homeCommunityId,
            requiresPasswordChange: updatedProfile.requiresPasswordChange,
            photoUrl: updatedProfile.photoUrl
        )
    }

    private func loadSubstitutions(accessToken: String) async throws {
        let response = try await client.substitutions(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        substitutions = response.substitutions
    }

    private func applyNotificationRead(_ update: MobileNotificationReadDTO) {
        guard let current = notifications.first(where: { $0.id == update.id }) else { return }

        notifications = notifications.map { notification in
            notification.id == update.id
                ? notification.withRead(read: update.read, readAt: update.readAt)
                : notification
        }

        if !current.read && update.read {
            unreadNotificationsCount = max(0, unreadNotificationsCount - 1)
        }
    }

    private func applyAllNotificationsRead() {
        let readAt = ISO8601DateFormatter().string(from: Date())
        notifications = notifications.map { $0.withRead(read: true, readAt: $0.readAt ?? readAt) }
        unreadNotificationsCount = 0
    }

    private func loadCurrentQuestionnaire(accessToken: String) async throws {
        questionnaireCurrent = try await client.currentQuestionnaire(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId,
            month: selectedMonth
        )
    }

    private func loadFormationOverview(accessToken: String) async throws {
        let response = try await client.formationOverview(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        formationOverview = response.overview
    }

    private func loadFormationResources(accessToken: String) async throws {
        async let certificatesResponse = client.formationCertificates(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        async let libraryResponse = client.formationLibrary(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )

        formationCertificates = try await certificatesResponse.certificates
        formationLibraryMaterials = try await libraryResponse.materials
    }

    private func writeFormationFile(_ data: Data, fileName: String) throws -> URL {
        let sanitizedName = fileName
            .components(separatedBy: CharacterSet(charactersIn: "/\\:"))
            .joined(separator: "-")
        let fallbackName = sanitizedName.isEmpty ? "formacao.bin" : sanitizedName
        let fileURL = FileManager.default.temporaryDirectory
            .appendingPathComponent("mesc-\(UUID().uuidString)-\(fallbackName)")
        try data.write(to: fileURL, options: .atomic)
        return fileURL
    }

    private func refreshFormationOverviewAfterProgress(accessToken: String) async {
        do {
            try await loadFormationOverview(accessToken: accessToken)
        } catch {
            // The mutation has already succeeded; retain its result in the lesson view.
        }
    }

    private func loadCurrentDevice(accessToken: String) async throws {
        let response = try await client.currentDevice(
            accessToken: accessToken,
            communityId: sessionStore.activeCommunityId,
            deviceId: sessionStore.deviceId
        )
        applyDevice(response.device)
    }

    private func handleRemoteNotificationToken(_ token: String) async {
        sessionStore.remotePushToken = token
        pushPermissionMessage = "Notificações nativas vinculadas a este iPhone."

        guard sessionState == .authenticated else { return }
        await updateCurrentDevice(
            pushToken: token,
            pushProvider: "apns",
            pushEnabled: true
        )
    }

    private func handleRemoteNotificationRegistrationFailure(_ message: String) async {
        pushPermissionMessage = "O iOS não concluiu o registro de notificações: \(message)"

        guard sessionState == .authenticated else { return }
        await updateCurrentDevice(pushEnabled: false)
    }

    private func syncStoredRemotePushTokenIfNeeded() async {
        guard pushEnabled, let token = sessionStore.remotePushToken else { return }
        guard currentDevice?.pushProvider != "apns" || currentDevice?.pushEnabled != true else { return }

        await updateCurrentDevice(
            pushToken: token,
            pushProvider: "apns",
            pushEnabled: true
        )
    }

    private func refreshSession() async -> Bool {
        guard let refreshToken = sessionStore.refreshToken else { return false }

        do {
            let response = try await client.refresh(refreshToken: refreshToken, deviceId: sessionStore.deviceId)
            persist(authResponse: response)
            user = response.user
            activeCommunity = response.communities.first(where: { $0.id == response.activeCommunityId }) ?? response.communities.first
            applyDevice(response.device)
            return true
        } catch {
            return false
        }
    }

    private func persist(authResponse response: MobileAuthResponseDTO) {
        sessionStore.accessToken = response.auth.accessToken
        sessionStore.refreshToken = response.auth.refreshToken
        sessionStore.activeCommunityId = response.activeCommunityId
        applyDevice(response.device)
    }

    private func handleSessionFailure(_ error: Error) {
        sessionStore.clearTokens()
        errorMessage = MESCMobileAPIClient.userMessage(for: error)
        sessionState = .unauthenticated
    }

    private static func isAuthenticationFailure(_ error: Error) -> Bool {
        switch error {
        case MESCMobileAPIError.unauthenticated:
            return true
        case let MESCMobileAPIError.server(status, _):
            return status == 401
        default:
            return false
        }
    }

    private func mutateSchedule(
        messageOnSuccess: String,
        operation: @escaping (String) async throws -> Void
    ) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        isMutatingSchedule = true
        scheduleActionMessage = nil

        do {
            try await operation(accessToken)
            try await loadHomeAndSchedules()
            scheduleActionMessage = messageOnSuccess
            isMutatingSchedule = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    try await operation(accessToken)
                    try await loadHomeAndSchedules()
                    scheduleActionMessage = messageOnSuccess
                    isMutatingSchedule = false
                    return true
                } catch {
                    scheduleActionMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                scheduleActionMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isMutatingSchedule = false
        return false
    }

    private func mutateProfile(
        messageOnSuccess: String,
        operation: @escaping (String, String) async throws -> Void
    ) async -> Bool {
        guard let accessToken = sessionStore.accessToken else {
            handleSessionFailure(MESCMobileAPIError.unauthenticated)
            return false
        }

        let idempotencyKey = UUID().uuidString
        isSavingProfile = true
        profileMessage = nil

        do {
            try await operation(accessToken, idempotencyKey)
            try await loadProfile(accessToken: accessToken)
            profileMessage = messageOnSuccess
            isSavingProfile = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let refreshedAccessToken = sessionStore.accessToken {
                do {
                    try await operation(refreshedAccessToken, idempotencyKey)
                    try await loadProfile(accessToken: refreshedAccessToken)
                    profileMessage = messageOnSuccess
                    isSavingProfile = false
                    return true
                } catch {
                    profileMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                profileMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isSavingProfile = false
        return false
    }

    @discardableResult
    private func updateCurrentDevice(
        pushToken: String? = nil,
        pushProvider: String? = nil,
        pushEnabled: Bool? = nil,
        biometricCapable: Bool? = nil,
        biometricEnabled: Bool? = nil,
        notificationPreferences: [String: Bool]? = nil
    ) async -> Bool {
        guard let accessToken = sessionStore.accessToken else { return false }

        isUpdatingSettings = true
        settingsMessage = nil

        do {
            let response = try await client.updateCurrentDevice(
                accessToken: accessToken,
                communityId: sessionStore.activeCommunityId,
                deviceId: sessionStore.deviceId,
                appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
                pushToken: pushToken,
                pushProvider: pushProvider,
                pushEnabled: pushEnabled,
                biometricCapable: biometricCapable,
                biometricEnabled: biometricEnabled,
                notificationPreferences: notificationPreferences
            )
            applyDevice(response.device)
            isUpdatingSettings = false
            return true
        } catch {
            if Self.isAuthenticationFailure(error), await refreshSession(), let accessToken = sessionStore.accessToken {
                do {
                    let response = try await client.updateCurrentDevice(
                        accessToken: accessToken,
                        communityId: sessionStore.activeCommunityId,
                        deviceId: sessionStore.deviceId,
                        appVersion: Bundle.main.object(forInfoDictionaryKey: "CFBundleShortVersionString") as? String,
                        pushToken: pushToken,
                        pushProvider: pushProvider,
                        pushEnabled: pushEnabled,
                        biometricCapable: biometricCapable,
                        biometricEnabled: biometricEnabled,
                        notificationPreferences: notificationPreferences
                    )
                    applyDevice(response.device)
                    isUpdatingSettings = false
                    return true
                } catch {
                    settingsMessage = MESCMobileAPIClient.userMessage(for: error)
                }
            } else if Self.isAuthenticationFailure(error) {
                handleSessionFailure(error)
            } else {
                settingsMessage = MESCMobileAPIClient.userMessage(for: error)
            }
        }

        isUpdatingSettings = false
        return false
    }

    private func applyDevice(_ device: MobileDeviceDTO?) {
        guard let device else { return }

        currentDevice = device
        if let enabled = device.biometricEnabled {
            biometricEnabled = enabled
        }

        if let preferences = device.notificationPreferences {
            var merged = MESCNotificationPreference.defaults
            for (key, value) in preferences {
                if case let .bool(enabled) = value {
                    merged[key] = enabled
                }
            }
            notificationPreferences = merged
        }
    }

    private func refreshBiometricCapability() {
        let context = LAContext()
        var error: NSError?
        biometricAvailable = context.canEvaluatePolicy(.deviceOwnerAuthenticationWithBiometrics, error: &error)

        switch context.biometryType {
        case .faceID:
            biometricTypeLabel = "Face ID"
        case .touchID:
            biometricTypeLabel = "Touch ID"
        default:
            biometricTypeLabel = "Face ID ou Touch ID"
        }
    }

    private func resolvedTrackId(for lesson: MobileFormationLessonDTO) -> String? {
        if let trackId = lesson.trackId, !trackId.isEmpty {
            return trackId
        }

        return formationOverview?.tracks.first(where: { track in
            track.modules.contains { module in
                module.id == lesson.moduleId || module.lessons.contains { $0.id == lesson.id }
            }
        })?.id
    }

    private func buildPublicScheduleMissions(
        from assignments: [MobilePublicScheduleAssignmentDTO],
        ownSchedules: [MobileMissionScheduleDTO]
    ) -> [ScheduleMission] {
        var ownScheduleById: [String: MobileMissionScheduleDTO] = [:]
        for schedule in ownSchedules where ownScheduleById[schedule.id] == nil {
            ownScheduleById[schedule.id] = schedule
        }
        let grouped = Dictionary(grouping: assignments) { assignment in
            "\(assignment.date)|\(assignment.time)|\(assignment.type)|\(assignment.location ?? "")"
        }

        return grouped.values.compactMap { group -> ScheduleMission? in
            let orderedGroup = group.sorted {
                if $0.position != $1.position { return $0.position < $1.position }
                return $0.id < $1.id
            }

            guard let first = orderedGroup.first,
                  let date = Self.parseDate(first.date),
                  let day = Calendar.current.dateComponents([.day], from: date).day
            else {
                return nil
            }

            let positions = orderedGroup.map { assignment in
                let name = assignment.scheduleDisplayName ?? assignment.ministerName ?? "Vaga"
                return SchedulePosition(
                    id: "\(assignment.id)-\(assignment.position)",
                    scheduleId: assignment.scheduleId,
                    position: assignment.position,
                    displayName: name,
                    isCurrentUser: assignment.isCurrentUser,
                    isVacant: assignment.ministerId == nil,
                    source: assignment.source
                )
            }
            let currentAssignment = orderedGroup.first(where: { $0.isCurrentUser })
            let ownSchedule = currentAssignment.flatMap { ownScheduleById[$0.scheduleId] }

            return ScheduleMission(
                id: "mass-\(first.scheduleId)",
                scheduleId: currentAssignment?.scheduleId ?? first.scheduleId,
                dayNumber: day,
                time: Self.timeLabel(first.time),
                title: Self.scheduleTitle(type: first.type),
                community: first.location ?? activeCommunity?.name ?? "Comunidade",
                role: currentAssignment.map { Self.positionDisplayLabel($0.position) } ?? "\(positions.count) ministros escalados",
                ministers: positions.map { "\($0.positionLabel): \($0.displayName)" },
                confirmationStatus: ownSchedule?.confirmationStatus,
                canConfirm: ownSchedule?.canConfirm ?? false,
                canRequestSubstitution: ownSchedule?.canRequestSubstitution ?? false,
                isCurrentUser: currentAssignment != nil,
                positions: positions,
                canEditMass: orderedGroup.contains { $0.canEditMass == true && $0.source == "schedule" }
            )
        }
    }

    private static func officialScheduleHTML(
        monthLabel: String,
        monthKey: String,
        communityName: String,
        assignments: [MobilePublicScheduleAssignmentDTO]
    ) -> String {
        let positionGroups: [(name: String, positions: [Int])] = [
            ("AUXILIAR", [1, 2]), ("RECOLHER", [3, 4]), ("VELAS", [5, 6]),
            ("ADORAÇÃO/FILA", [7, 8]), ("PURIFICAR/EXPOR", [9, 10, 11, 12]),
            ("MEZANINO", [13, 14, 15]), ("CORREDOR AMBÃO", [16]), ("CORREDOR CAPELA", [17]),
            ("CORREDOR CADEIRAS", [18]), ("NAVE CENTRAL PE. PIO", [19]),
            ("NAVE CENTRAL LADO MÚSICOS", [20, 21]), ("NAVE CENTRAL AMBÃO", [22]),
            ("NAVE CENTRAL CAPELA", [23]), ("ÁTRIO EXTERNO", [24, 25, 26, 27, 28]),
        ]
        let namesByMassAndPosition = Dictionary(grouping: assignments) { assignment in
            "\(assignment.date)|\(timeLabel(assignment.time))"
        }
        let startDate = monthStartDate(from: monthKey) ?? Date()
        let dayRange = Calendar.current.range(of: .day, in: .month, for: startDate) ?? 1..<32
        let headerGroups = positionGroups.map { "<th colspan=\"\($0.positions.count)\">\($0.name)</th>" }.joined()
        let headerPositions = positionGroups.flatMap(\.positions).map { "<th>\($0)</th>" }.joined()
        let dateFormatter = DateFormatter()
        dateFormatter.locale = Locale(identifier: "pt_BR")
        dateFormatter.dateFormat = "EEEE"
        let rows = dayRange.flatMap { day -> [String] in
            guard let date = Calendar.current.date(bySetting: .day, value: day, of: startDate) else { return [] }
            let dateKey = Self.isoDate(date)
            let assignedTimes = assignments
                .filter { $0.date == dateKey }
                .map { timeLabel($0.time) }
            let times = Array(Set(officialMassTimes(for: date) + assignedTimes)).sorted()

            return times.map { time in
                let group = namesByMassAndPosition["\(dateKey)|\(time)"] ?? []
                let namesByPosition = Dictionary(uniqueKeysWithValues: group.map { assignment in
                    (assignment.position, escapeHTML(assignment.scheduleDisplayName ?? assignment.ministerName ?? ""))
                })
                let cells = (1...28).map { "<td>\(namesByPosition[$0] ?? "")</td>" }.joined()
                let colors = officialMassColors(for: date, time: time)
                return "<tr style=\"background-color: \(colors.background); color: \(colors.text);\"><td>\(day)</td><td>\(escapeHTML(dateFormatter.string(from: date)))</td><td>\(time)</td>\(cells)</tr>"
            }
        }.joined(separator: "\n")
        let logoHTML = UIImage(named: "Splash")?.pngData().map {
            "<img src=\"data:image/png;base64,\($0.base64EncodedString())\" alt=\"MESC\" class=\"logo\">"
        } ?? ""

        return """
        <!doctype html>
        <html lang="pt-BR">
        <head>
          <meta charset="utf-8">
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <title>Escala - \(escapeHTML(monthLabel))</title>
          <style>
            body { font-family: Arial, sans-serif; font-size: 12px; margin: 20px; color: #2C2C2C; }
            .header { display: flex; align-items: center; justify-content: center; margin: 16px 0 10px; position: relative; min-height: 64px; }
            .logo { position: absolute; left: 14px; width: 58px; height: 58px; object-fit: cover; object-position: center 33%; border-radius: 10px; }
            h1 { text-align: center; font-size: 18px; margin: 0; }
            .community { text-align: center; margin: 0 0 12px; color: #595959; }
            .legend { display: flex; justify-content: center; gap: 15px; margin: 12px 0; font-size: 10px; flex-wrap: wrap; }
            .legend span { display: inline-flex; align-items: center; gap: 5px; }
            .legend i { width: 11px; height: 11px; border: 1px solid #777; display: inline-block; }
            table { width: 100%; border-collapse: collapse; margin-top: 8px; }
            th, td { border: 1px solid #000; padding: 5px 4px; text-align: left; vertical-align: middle; }
            th { background-color: #e0e0e0; font-weight: bold; text-align: center; font-size: 9px; }
            td { font-size: 9px; min-width: 42px; }
            td:nth-child(-n+3) { font-weight: 600; min-width: auto; white-space: nowrap; }
            @media print { @page { size: A3 landscape; margin: 0.5cm; } body { margin: 0; font-size: 8px; } th, td { padding: 2px 3px; font-size: 7px; } .logo { width: 46px; height: 46px; } }
          </style>
        </head>
        <body>
          <div class="header">\(logoHTML)<h1>SANTUÁRIO SÃO JUDAS TADEU - \(escapeHTML(monthLabel.uppercased()))</h1></div>
          <p class="community">\(escapeHTML(communityName))</p>
          <div class="legend">
            <span><i style="background:#c5c6c8"></i>Missa Diária</span><span><i style="background:#ffda9e"></i>Missa Dominical</span><span><i style="background:#d4b5e8"></i>Adoração ao Santíssimo</span><span><i style="background:#b2e2f2"></i>Cura e Libertação</span><span><i style="background:#fabfb7"></i>Sagrado Coração de Jesus</span><span><i style="background:#e3b1c8"></i>Imaculado Coração de Maria</span><span><i style="background:#fdf9c4"></i>Novena de Outubro</span>
          </div>
          <table>
            <thead>
              <tr><th rowspan="2">Data</th><th rowspan="2">Dia</th><th rowspan="2">Hora</th>\(headerGroups)</tr>
              <tr>\(headerPositions)</tr>
            </thead>
            <tbody>
              \(rows.isEmpty ? "<tr><td colspan=\"31\">Sem escala publicada para este mês.</td></tr>" : rows)
            </tbody>
          </table>
        </body>
        </html>
        """
    }

    private static func officialMassTimes(for date: Date) -> [String] {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: date)
        let day = calendar.component(.day, from: date)
        let month = calendar.component(.month, from: date)
        let firstWeek = (1...7).contains(day)

        if month == 10 && (20...27).contains(day) {
            if weekday >= 2 && weekday <= 6 { return ["19:30"] }
            if weekday == 7 { return ["19:00"] }
        }
        if weekday == 1 { return ["08:00", "10:00", "19:00"] }

        var times = ["06:30"]
        if weekday == 5 && firstWeek { times.append("19:30") }
        return times
    }

    private static func officialMassColors(for date: Date, time: String) -> (background: String, text: String) {
        let calendar = Calendar.current
        let weekday = calendar.component(.weekday, from: date)
        let day = calendar.component(.day, from: date)
        let month = calendar.component(.month, from: date)
        let firstWeek = (1...7).contains(day)
        if month == 10 && (20...27).contains(day) { return ("#fdf9c4", "#8B7500") }
        if weekday == 1 { return ("#ffda9e", "#8B5A00") }
        if weekday == 2 && time == "22:00" { return ("#d4b5e8", "#5B2C6F") }
        if weekday == 5 && firstWeek && time == "19:30" { return ("#b2e2f2", "#0D5F7F") }
        if weekday == 6 && firstWeek { return ("#fabfb7", "#8B3A3A") }
        if weekday == 7 && firstWeek { return ("#e3b1c8", "#6B2D5C") }
        return ("#c5c6c8", "#2C2C2C")
    }

    private static func isoDate(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private static func escapeHTML(_ value: String) -> String {
        value
            .replacingOccurrences(of: "&", with: "&amp;")
            .replacingOccurrences(of: "<", with: "&lt;")
            .replacingOccurrences(of: ">", with: "&gt;")
            .replacingOccurrences(of: "\"", with: "&quot;")
            .replacingOccurrences(of: "'", with: "&#39;")
    }

    private static func optionalText(_ value: String) -> String? {
        let trimmed = value.trimmingCharacters(in: .whitespacesAndNewlines)
        return trimmed.isEmpty ? nil : trimmed
    }

    private static func profileDateString(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.string(from: date)
    }

    private static func currentMonthString() -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: Date())
    }

    private static func monthString(from date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "yyyy-MM"
        return formatter.string(from: date)
    }

    private static func monthStartDate(from month: String) -> Date? {
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: "\(month)-01")
    }

    static func monthLabel(from month: String) -> String {
        guard let date = monthStartDate(from: month) else { return month }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "LLLL 'de' yyyy"
        return formatter.string(from: date).capitalized
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value else { return nil }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }

    static func scheduleDateTitle(date: String?) -> String {
        guard let parsed = parseDate(date) else { return "Próxima escala" }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "EEEE, dd 'de' MMMM"
        return formatter.string(from: parsed).capitalized
    }

    static func compactDateTimeLabel(_ value: String) -> String {
        let isoWithFraction = ISO8601DateFormatter()
        isoWithFraction.formatOptions = [.withInternetDateTime, .withFractionalSeconds]
        let iso = ISO8601DateFormatter()
        let parsed = isoWithFraction.date(from: value) ?? iso.date(from: value) ?? parseDate(value)

        guard let parsed else { return value }
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "dd/MM/yyyy HH:mm"
        return formatter.string(from: parsed)
    }

    static func timeLabel(_ value: String) -> String {
        String(value.prefix(5))
    }

    static func scheduleHasPassed(date: String, time: String, now: Date = Date()) -> Bool {
        let dateParts = date.split(separator: "-").compactMap { Int($0) }
        let timeParts = time.split(separator: ":").compactMap { Int($0) }

        guard dateParts.count == 3, timeParts.count >= 2 else {
            return false
        }

        var components = DateComponents()
        components.calendar = Calendar.current
        components.timeZone = .current
        components.year = dateParts[0]
        components.month = dateParts[1]
        components.day = dateParts[2]
        components.hour = timeParts[0]
        components.minute = timeParts[1]

        guard let scheduleDate = Calendar.current.date(from: components) else {
            return false
        }
        return scheduleDate < now
    }

    static func scheduleTitle(type: String) -> String {
        switch type.lowercased() {
        case "missa", "mass", "schedule":
            return "Missa"
        case "adoration":
            return "Adoração"
        default:
            return type.capitalized
        }
    }

    nonisolated static func positionLabel(_ position: Int?) -> String {
        guard let position, position > 0 else { return "Ministro" }
        return "Posição \(position)"
    }

    nonisolated static func positionDisplayLabel(_ position: Int?) -> String {
        guard let position, position > 0 else { return "Ministro" }
        return "Posição \(position) · \(positionDescription(position))"
    }

    nonisolated static func positionDescription(_ position: Int) -> String {
        let descriptions = [
            1: "Auxiliar 1", 2: "Auxiliar 2", 3: "Recolher 1", 4: "Recolher 2",
            5: "Velas 1", 6: "Velas 2", 7: "Adoração/Fila 1", 8: "Adoração/Fila 2",
            9: "Purificar/Expor 1", 10: "Purificar/Expor 2", 11: "Purificar/Expor 3", 12: "Purificar/Expor 4",
            13: "Mezanino 1", 14: "Mezanino 2", 15: "Mezanino 3", 16: "Corredor Ambão",
            17: "Corredor Capela", 18: "Corredor Cadeiras", 19: "Nave Central Pe. Pio",
            20: "Nave Central Lado Músicos 1", 21: "Nave Central Lado Músicos 2", 22: "Nave Central Ambão",
            23: "Nave Central Capela", 24: "Átrio Externo 1", 25: "Átrio Externo 2", 26: "Átrio Externo 3",
            27: "Átrio Externo 4", 28: "Átrio Externo 5",
        ]
        return descriptions[position] ?? "Posição \(position)"
    }
}

private enum MESCProfileImageEncoder {
    static func jpegData(from image: UIImage) -> Data? {
        let maxDimension: CGFloat = 1_600
        let originalSize = image.size
        guard originalSize.width > 0, originalSize.height > 0 else { return nil }

        let scale = min(1, maxDimension / max(originalSize.width, originalSize.height))
        let targetSize = CGSize(width: originalSize.width * scale, height: originalSize.height * scale)
        let format = UIGraphicsImageRendererFormat.default()
        format.scale = 1
        let rendered = UIGraphicsImageRenderer(size: targetSize, format: format).image { _ in
            image.draw(in: CGRect(origin: .zero, size: targetSize))
        }

        var quality: CGFloat = 0.84
        var data = rendered.jpegData(compressionQuality: quality)
        while let currentData = data, currentData.count > 4 * 1024 * 1024, quality > 0.48 {
            quality -= 0.12
            data = rendered.jpegData(compressionQuality: quality)
        }
        return data
    }
}

struct MESCNativeRootView: View {
    @Environment(\.scenePhase) private var scenePhase
    @State private var selectedTab: MESCTab = .mission
    @StateObject private var appModel = MESCNativeAppModel()

    var body: some View {
        Group {
            switch appModel.sessionState {
            case .checking:
                LoadingScreen()
            case .unauthenticated:
                NativeLoginScreen()
                    .environmentObject(appModel)
            case .authenticated:
                authenticatedShell
                    .environmentObject(appModel)
            }
        }
        .task {
            await appModel.restoreSessionIfNeeded()
        }
        .onChange(of: scenePhase) { phase in
            guard phase == .active else { return }
            Task { await appModel.refreshNativeNotificationState() }
        }
        .onChange(of: appModel.pendingNotificationDeepLink) { _ in
            routePendingNotificationIfPossible()
        }
        .onChange(of: appModel.sessionState) { _ in
            routePendingNotificationIfPossible()
        }
        .sheet(isPresented: $appModel.isNotificationCenterPresented) {
            MESCNotificationCenterSheet { deepLink in
                openNotification(deepLink)
            }
            .environmentObject(appModel)
        }
        .tint(MESCColor.primaryRed)
    }

    private var authenticatedShell: some View {
        TabView(selection: $selectedTab) {
            ForEach(availableTabs) { tab in
                MESCNativeTabPage {
                    screen(for: tab)
                }
                .tag(tab)
                .tabItem {
                    Label(tab.title, systemImage: tab.symbol)
                }
            }
        }
        .background(MESCBackground())
        .tint(MESCColor.accent)
    }

    private var availableTabs: [MESCTab] {
        var tabs: [MESCTab] = [.mission, .schedules, .formation, .profile, .settings]
        if appModel.canManageCommunity {
            tabs.insert(.coordination, at: 1)
        }
        return tabs
    }

    @ViewBuilder
    private func screen(for tab: MESCTab) -> some View {
        switch tab {
        case .mission:
            MissionScreen()
        case .coordination:
            CoordinatorScreen()
        case .schedules:
            SchedulesScreen()
        case .formation:
            FormationScreen()
        case .profile:
            ProfileScreen()
        case .settings:
            SettingsScreen()
        }
    }

    private func routePendingNotificationIfPossible() {
        guard appModel.sessionState == .authenticated,
              let deepLink = appModel.pendingNotificationDeepLink
        else {
            return
        }

        appModel.pendingNotificationDeepLink = nil
        UserDefaults.standard.removeObject(forKey: Notification.Name.mescRemoteNotificationDeepLinkStorageKey)
        openNotification(deepLink)
    }

    private func openNotification(_ deepLink: String) {
        appModel.isNotificationCenterPresented = false

        switch MESCNotificationDestination.resolve(deepLink) {
        case .questionnaire:
            selectedTab = .mission
            appModel.isQuestionnairePresentationRequested = true
        case .schedules:
            selectedTab = .schedules
        case .substitutions:
            selectedTab = .schedules
            appModel.isSubstitutionCenterPresentationRequested = true
        case .formation:
            selectedTab = .formation
        case .profile:
            selectedTab = .profile
        case .settings:
            selectedTab = .settings
        case .mission, .communication:
            selectedTab = .mission
        }
    }
}

struct MESCNativeTabPage<Content: View>: View {
    @ViewBuilder let content: Content

    var body: some View {
        ZStack {
            MESCBackground()
            content
        }
    }
}

enum MESCTab: String, CaseIterable, Identifiable {
    case mission
    case coordination
    case schedules
    case formation
    case profile
    case settings

    var id: String { rawValue }

    var title: String {
        switch self {
        case .mission: return "Servir"
        case .coordination: return "Coordenação"
        case .schedules: return "Escalas"
        case .formation: return "Formação"
        case .profile: return "Perfil"
        case .settings: return "Ajustes"
        }
    }

    var symbol: String {
        switch self {
        case .mission: return "cross.fill"
        case .coordination: return "person.3"
        case .schedules: return "calendar"
        case .formation: return "book.closed"
        case .profile: return "person"
        case .settings: return "gearshape"
        }
    }
}

private enum MESCNotificationDestination {
    case mission
    case questionnaire
    case schedules
    case substitutions
    case formation
    case profile
    case settings
    case communication

    static func resolve(_ deepLink: String) -> MESCNotificationDestination {
        let path = deepLink.split(separator: "?", maxSplits: 1).first.map(String.init) ?? deepLink

        if path == "/questionnaire" || path.hasPrefix("/questionnaires") {
            return .questionnaire
        }
        if path == "/formation" || path.hasPrefix("/formation/") {
            return .formation
        }
        if path == "/schedules/substitutions" || path.hasPrefix("/substitutions") {
            return .substitutions
        }
        if path == "/schedules" || path.hasPrefix("/schedules/") {
            return .schedules
        }
        if path == "/profile" {
            return .profile
        }
        if path == "/settings" {
            return .settings
        }
        if path == "/communication" || path == "/notifications" || path == "/notices" {
            return .communication
        }
        return .mission
    }
}

struct ShareFile: Identifiable {
    let id = UUID()
    let url: URL
}

struct SubstitutionTarget: Identifiable {
    let id: String
    let scheduleId: String
    let title: String
    let subtitle: String
}

struct MESCNotificationPreference: Identifiable {
    let key: String
    let title: String
    let detail: String
    let symbol: String

    var id: String { key }

    static let options = [
        MESCNotificationPreference(
            key: "questionnaire_published",
            title: "Novo questionário",
            detail: "Quando a coordenação publicar o questionário.",
            symbol: "list.clipboard"
        ),
        MESCNotificationPreference(
            key: "coordinator_announcement",
            title: "Avisos da coordenação",
            detail: "Comunicados importantes do ministério.",
            symbol: "megaphone"
        ),
        MESCNotificationPreference(
            key: "questionnaire_closed",
            title: "Encerramento do questionário",
            detail: "Aviso quando o prazo for encerrado.",
            symbol: "lock.doc"
        ),
        MESCNotificationPreference(
            key: "schedule_published",
            title: "Escala publicada",
            detail: "Quando uma nova escala estiver disponível.",
            symbol: "calendar.badge.checkmark"
        ),
        MESCNotificationPreference(
            key: "substitution_requested",
            title: "Pedidos de substituição",
            detail: "Quando alguém precisar de substituto.",
            symbol: "arrow.triangle.2.circlepath"
        ),
        MESCNotificationPreference(
            key: "substitute_accepted",
            title: "Substituto aceitou",
            detail: "Quando seu pedido for atendido.",
            symbol: "person.crop.circle.badge.checkmark"
        ),
        MESCNotificationPreference(
            key: "formation_available",
            title: "Novo treinamento",
            detail: "Quando houver nova aula ou material.",
            symbol: "graduationcap"
        ),
        MESCNotificationPreference(
            key: "schedule_reminder",
            title: "Lembrete de escalação",
            detail: "Antes da missa em que você foi escalado.",
            symbol: "bell.badge"
        ),
    ]

    static let defaults = Dictionary(uniqueKeysWithValues: options.map { ($0.key, true) })
}

struct ActivityView: UIViewControllerRepresentable {
    let activityItems: [Any]

    func makeUIViewController(context: Context) -> UIActivityViewController {
        UIActivityViewController(activityItems: activityItems, applicationActivities: nil)
    }

    func updateUIViewController(_ uiViewController: UIActivityViewController, context: Context) {}
}

struct LoadingScreen: View {
    var body: some View {
        ZStack {
            MESCBackground()
            VStack(spacing: 18) {
                MESCLogoMark(size: 92, cornerRadius: 30)

                ProgressView()
                    .tint(MESCColor.accent)

                Text("Preparando seu espaço de serviço")
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
            }
        }
    }
}

struct NativeLoginScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                VStack(spacing: 22) {
                    Spacer(minLength: 38)

                    VStack(spacing: 12) {
                        MESCLogoMark(size: 108, cornerRadius: 34)

                        Text("MESC")
                            .font(MESCFont.screenTitle)
                            .foregroundStyle(MESCColor.textPrimary)

                        Text("São Judas Tadeu")
                            .font(MESCFont.callout)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    .padding(.top, 20)

                    GlassPanel(spacing: 16) {
                        SectionTitle(title: "Entrar", symbol: "person.crop.circle.badge.checkmark")

                        VStack(alignment: .leading, spacing: 8) {
                            Text("E-mail")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.textSecondary)
                            TextField("seu@email.com", text: $appModel.email)
                                .textInputAutocapitalization(.never)
                                .keyboardType(.emailAddress)
                                .autocorrectionDisabled()
                                .font(MESCFont.body)
                                .padding(14)
                                .background(MESCColor.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .overlay(fieldBorder)
                        }

                        VStack(alignment: .leading, spacing: 8) {
                            Text("Senha")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.textSecondary)
                            SecureField("Sua senha", text: $appModel.password)
                                .font(MESCFont.body)
                                .padding(14)
                                .background(MESCColor.surface, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                                .overlay(fieldBorder)
                        }

                        Toggle(isOn: $appModel.keepSignedIn) {
                            Text("Manter conectado neste aparelho")
                                .font(MESCFont.subheadline)
                        }
                        .tint(MESCColor.accent)

                        if let errorMessage = appModel.errorMessage {
                            Label(errorMessage, systemImage: "exclamationmark.triangle")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.primaryWine)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        MESCPrimaryButton(
                            title: appModel.isLoading ? "Entrando..." : "Entrar",
                            symbol: "arrow.right.circle"
                        ) {
                            Task { await appModel.signIn() }
                        }
                        .disabled(appModel.isLoading)
                    }

                    Text("Primeiro acesso sempre com senha. Biometria será habilitada depois do login.")
                        .font(MESCFont.caption)
                        .multilineTextAlignment(.center)
                        .foregroundStyle(MESCColor.textSecondary)
                        .padding(.horizontal, 24)

                    Spacer(minLength: 32)
                }
                .padding(.horizontal, 18)
            }
        }
    }

    private var fieldBorder: some View {
        RoundedRectangle(cornerRadius: 14, style: .continuous)
            .stroke(MESCColor.separator, lineWidth: 1)
    }
}

struct MissionScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var isQuestionnairePresented = false
    @State private var isSubstitutionCenterPresented = false
    @State private var substitutionTarget: SubstitutionTarget?

    var body: some View {
        let mission = appModel.missionHome?.nextMission

        MESCScrollScreen(title: appModel.activeCommunity?.name ?? "São Judas Tadeu", subtitle: "Paz e bem, \(appModel.firstName)") {
            if appModel.isUsingFallbackData {
                FallbackBanner()
            }

            GlassPanel(spacing: 16) {
                if let mission {
                    VStack(alignment: .leading, spacing: 4) {
                        Text("Próxima escala")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.accent)
                        Text("Você está escalado")
                            .font(MESCFont.title2)
                            .foregroundStyle(MESCColor.textPrimary)
                    }

                    VStack(alignment: .leading, spacing: 4) {
                        Text(MESCNativeAppModel.positionLabel(mission.position))
                            .font(MESCFont.title2)
                            .foregroundStyle(MESCColor.accent)
                        if let position = mission.position {
                            Text(MESCNativeAppModel.positionDescription(position))
                                .font(MESCFont.cardTitle)
                                .foregroundStyle(MESCColor.textPrimary)
                        } else {
                            Text("Função na escala")
                                .font(MESCFont.cardTitle)
                                .foregroundStyle(MESCColor.textPrimary)
                        }
                        Text("Sua função nesta missa")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }

                    Divider()
                        .opacity(0.55)

                    Label(MESCNativeAppModel.scheduleDateTitle(date: mission.date), systemImage: "calendar")
                        .font(MESCFont.callout.weight(.semibold))
                        .foregroundStyle(MESCColor.textSecondary)

                    HStack(spacing: 14) {
                        Label(MESCNativeAppModel.timeLabel(mission.time), systemImage: "clock")
                        Label(mission.location ?? appModel.activeCommunity?.name ?? "Comunidade", systemImage: "mappin.and.ellipse")
                            .lineLimit(1)
                    }
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                } else {
                    EmptyState(
                        title: "Nenhuma escala publicada",
                        detail: "Assim que a coordenação publicar uma escala, ela aparecerá aqui."
                    )
                }

                HStack(spacing: 12) {
                    MESCPrimaryButton(
                        title: mission?.confirmationStatus == "confirmed" ? "Confirmado" : "Confirmar",
                        symbol: mission?.confirmationStatus == "confirmed" ? "checkmark.seal.fill" : "checkmark.circle"
                    ) {
                        guard let mission else { return }
                        Task { await appModel.confirmSchedule(scheduleId: mission.id) }
                    }
                    .disabled(mission?.canConfirm != true || appModel.isMutatingSchedule)

                    MESCSecondaryButton(title: "Trocar", symbol: "arrow.triangle.2.circlepath") {
                        guard let mission else { return }
                        substitutionTarget = SubstitutionTarget(
                            id: mission.id,
                            scheduleId: mission.id,
                            title: "\(MESCNativeAppModel.scheduleDateTitle(date: mission.date)) às \(MESCNativeAppModel.timeLabel(mission.time))",
                            subtitle: mission.location ?? appModel.activeCommunity?.name ?? "Comunidade"
                        )
                    }
                    .disabled(mission?.canRequestSubstitution != true || appModel.isMutatingSchedule)
                }

                if let message = appModel.scheduleActionMessage {
                    Label(message, systemImage: message.contains("sucesso") || message.contains("publicado") ? "checkmark.seal" : "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(message.contains("sucesso") || message.contains("publicado") ? MESCColor.accent : MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }

            StatusPill(title: questionnaireStatus, symbol: "list.bullet.clipboard", tint: MESCColor.gold)

            if let questionnaire = appModel.activeQuestionnaire {
                GlassPanel(spacing: 14) {
                    SectionTitle(title: questionnaire.responseStatus == "answered" ? "Questionário respondido" : "Questionário aberto", symbol: "list.clipboard")
                    Text(questionnaire.title)
                        .font(MESCFont.cardTitle)
                    Text(questionnaire.description ?? "Informe sua disponibilidade para que a coordenação gere uma escala mais fiel.")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    if let deadline = questionnaire.deadline {
                        Text("Prazo: \(MESCNativeAppModel.compactDateTimeLabel(deadline))")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.accent)
                    }
                    MESCPrimaryButton(
                        title: questionnaire.responseStatus == "answered" ? "Revisar resposta" : "Responder agora",
                        symbol: "square.and.pencil"
                    ) {
                        isQuestionnairePresented = true
                    }
                }
            }

            GlassPanel(spacing: 12) {
                SectionTitle(title: "Para acompanhar", symbol: "checklist")
                let pendingActions = appModel.missionHome?.pendingActions ?? []
                let notices = appModel.missionHome?.notices ?? []

                if pendingActions.isEmpty && notices.isEmpty {
                    EmptyState(title: "Nada pendente agora", detail: "Quando houver avisos, questionários ou substituições, eles aparecerão aqui.")
                } else {
                    ForEach(pendingActions) { action in
                        Button {
                            switch action.type {
                            case "questionnaire":
                                isQuestionnairePresented = true
                            case "substitution":
                                isSubstitutionCenterPresented = true
                            default:
                                break
                            }
                        } label: {
                            PendingActionRow(action: action)
                        }
                        .buttonStyle(.plain)
                    }

                    ForEach(notices) { notice in
                        NoticeSummaryRow(notice: notice)
                    }
                }
            }
        }
        .sheet(isPresented: $isQuestionnairePresented) {
            QuestionnaireSheet()
                .environmentObject(appModel)
        }
        .sheet(isPresented: $isSubstitutionCenterPresented) {
            SubstitutionCenterSheet()
                .environmentObject(appModel)
        }
        .sheet(item: $substitutionTarget) { target in
            SubstitutionRequestSheet(target: target)
                .environmentObject(appModel)
        }
        .onAppear {
            presentQuestionnaireIfRequested()
        }
        .onChange(of: appModel.isQuestionnairePresentationRequested) { _ in
            presentQuestionnaireIfRequested()
        }
    }

    private var questionnaireStatus: String {
        let hasQuestionnaire = appModel.missionHome?.pendingActions.contains { $0.type == "questionnaire" } ?? true
        return hasQuestionnaire ? "Questionário aberto" : "Questionário em dia"
    }

    private func presentQuestionnaireIfRequested() {
        guard appModel.isQuestionnairePresentationRequested else { return }
        appModel.isQuestionnairePresentationRequested = false
        isQuestionnairePresented = true
    }
}

struct QuestionnaireSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var answers: [String: QuestionnaireDraftAnswer] = [:]
    @State private var sharedWithFamilyIds: Set<String> = []
    @State private var localMessage: String?

    var body: some View {
        ZStack {
            MESCBackground()

            if let questionnaire = appModel.activeQuestionnaire {
                ScrollView(showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: 18) {
                        header(questionnaire)

                        if questionnaire.responseStatus == "answered" {
                            Label("Você já respondeu este questionário. Enviar novamente atualiza sua resposta.", systemImage: "checkmark.seal")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.accent)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(14)
                                .frame(maxWidth: .infinity, alignment: .leading)
                                .mescGlass(cornerRadius: 16)
                        }

                        ForEach(visibleQuestions(for: questionnaire)) { question in
                            QuestionnaireQuestionCard(
                                question: question,
                                draft: binding(for: question)
                            )
                        }

                        if !questionnaire.familyMembers.isEmpty {
                            familySharing(questionnaire)
                        }

                        if let message = localMessage ?? appModel.questionnaireMessage {
                            Label(message, systemImage: "info.circle")
                                .font(MESCFont.caption)
                                .foregroundStyle(message.contains("sucesso") ? MESCColor.accent : MESCColor.primaryWine)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        MESCPrimaryButton(
                            title: appModel.isSavingQuestionnaire ? "Salvando..." : "Salvar resposta",
                            symbol: "checkmark.circle"
                        ) {
                            Task { await save(questionnaire) }
                        }
                        .disabled(appModel.isSavingQuestionnaire)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 20)
                    .padding(.bottom, 34)
                }
            } else {
                EmptyState(title: "Nenhum questionário aberto", detail: "Quando a coordenação publicar um questionário, ele aparecerá aqui.")
                    .padding(24)
            }
        }
        .task(id: appModel.activeQuestionnaire?.id) {
            guard let questionnaire = appModel.activeQuestionnaire else { return }
            hydrateAnswers(from: questionnaire)
        }
    }

    private func header(_ questionnaire: MobileQuestionnaireDTO) -> some View {
        GlassPanel(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "list.clipboard", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Questionário")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text(questionnaire.title)
                        .font(MESCFont.title2)
                    if let description = questionnaire.description {
                        Text(description)
                            .font(MESCFont.body)
                            .foregroundStyle(MESCColor.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                    if let deadline = questionnaire.deadline {
                        Text("Prazo: \(MESCNativeAppModel.compactDateTimeLabel(deadline))")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                }
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MESCColor.textPrimary)
                        .frame(width: 34, height: 34)
                        .background(MESCColor.surface.opacity(0.72), in: Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func binding(for question: MobileQuestionnaireQuestionDTO) -> Binding<QuestionnaireDraftAnswer> {
        Binding(
            get: { answers[question.id] ?? QuestionnaireDraftAnswer() },
            set: { answers[question.id] = $0 }
        )
    }

    private func save(_ questionnaire: MobileQuestionnaireDTO) async {
        let result = makePayload(for: questionnaire)
        if let validationMessage = result.validationMessage {
            localMessage = validationMessage
            return
        }

        localMessage = nil
        let success = await appModel.submitQuestionnaire(
            answers: result.answers,
            sharedWithFamilyIds: Array(sharedWithFamilyIds)
        )
        if success {
            localMessage = "Resposta salva com sucesso."
        }
    }

    private func makePayload(for questionnaire: MobileQuestionnaireDTO) -> (answers: [MobileQuestionnaireAnswerDTO], validationMessage: String?) {
        var payload: [MobileQuestionnaireAnswerDTO] = []

        for question in visibleQuestions(for: questionnaire) {
            let draft = answers[question.id] ?? QuestionnaireDraftAnswer()
            if question.required == true, draft.isEmpty(for: question) {
                return ([], "Responda a pergunta obrigatória: \(question.title)")
            }

            guard !draft.isEmpty(for: question) else { continue }
            payload.append(MobileQuestionnaireAnswerDTO(questionId: question.id, answer: draft.answerValue(for: question)))
        }

        guard !payload.isEmpty else {
            return ([], "Preencha ao menos uma resposta antes de salvar.")
        }

        return (payload, nil)
    }

    private func visibleQuestions(for questionnaire: MobileQuestionnaireDTO) -> [MobileQuestionnaireQuestionDTO] {
        questionnaire.questions.filter(isVisible)
    }

    private func familySharing(_ questionnaire: MobileQuestionnaireDTO) -> some View {
        GlassPanel(spacing: 12) {
            VStack(alignment: .leading, spacing: 10) {
                Label("Compartilhar disponibilidade", systemImage: "person.2")
                    .font(MESCFont.cardTitle)
                    .foregroundStyle(MESCColor.textPrimary)
                Text("Use apenas quando a resposta também representar um familiar vinculado nesta comunidade. A resposta própria dele sempre prevalece.")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)

                ForEach(questionnaire.familyMembers) { member in
                    Toggle(member.displayName, isOn: Binding(
                        get: { sharedWithFamilyIds.contains(member.id) },
                        set: { enabled in
                            if enabled {
                                sharedWithFamilyIds.insert(member.id)
                            } else {
                                sharedWithFamilyIds.remove(member.id)
                            }
                        }
                    ))
                    .font(MESCFont.body)
                    .tint(MESCColor.accent)
                }
            }
        }
    }

    private func isVisible(_ question: MobileQuestionnaireQuestionDTO) -> Bool {
        guard let metadata = question.metadata?.objectValue,
              let dependsOn = metadata["dependsOn"]?.stringValue else {
            return true
        }

        let expected = expectedValues(from: metadata["enabledWhen"] ?? metadata["showIf"])
        guard !expected.isEmpty else { return true }

        if expected.contains(answers[dependsOn]?.comparisonValue ?? "") {
            return true
        }

        guard let alternativeDependsOn = metadata["alternativeDependsOn"]?.stringValue,
              let alternativeExpected = metadata["alternativeShowIf"]?.stringValue else {
            return false
        }

        return answers[alternativeDependsOn]?.comparisonValue == alternativeExpected
    }

    private func expectedValues(from value: JSONValue?) -> Set<String> {
        if let value = value?.stringValue {
            return [value]
        }
        return Set(value?.arrayValue?.compactMap(\.stringValue) ?? [])
    }

    private func hydrateAnswers(from questionnaire: MobileQuestionnaireDTO) {
        guard answers.isEmpty, let response = questionnaire.response else { return }
        sharedWithFamilyIds = Set(response.sharedWithFamilyIds)
        guard !response.answers.isEmpty else { return }
        let questionsById = Dictionary(uniqueKeysWithValues: questionnaire.questions.map { ($0.id, $0) })

        answers = Dictionary(uniqueKeysWithValues: response.answers.compactMap { answer in
            guard let question = questionsById[answer.questionId] else { return nil }
            return (question.id, QuestionnaireDraftAnswer(answer: answer.answer, for: question))
        })
    }
}

struct SubstitutionRequestSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let target: SubstitutionTarget
    @State private var reason = ""

    var body: some View {
        ZStack {
            MESCBackground()

            VStack(alignment: .leading, spacing: 18) {
                GlassPanel(spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        SymbolTile(symbol: "arrow.triangle.2.circlepath", tint: MESCColor.gold)
                        VStack(alignment: .leading, spacing: 6) {
                            Text("Pedido de substituição")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.accent)
                            Text(target.title)
                                .font(MESCFont.title2)
                            Text(target.subtitle)
                                .font(MESCFont.body)
                                .foregroundStyle(MESCColor.textSecondary)
                        }
                        Spacer()
                        Button {
                            dismiss()
                        } label: {
                            Image(systemName: "xmark")
                                .font(.system(size: 14, weight: .bold))
                                .foregroundStyle(MESCColor.textPrimary)
                                .frame(width: 34, height: 34)
                                .background(MESCColor.surface.opacity(0.72), in: Circle())
                        }
                        .buttonStyle(.plain)
                    }
                }

                GlassPanel(spacing: 12) {
                    SectionTitle(title: "Mensagem para quem puder ajudar", symbol: "text.bubble")
                    TextEditor(text: $reason)
                        .font(MESCFont.body)
                        .frame(minHeight: 110)
                        .padding(10)
                        .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(MESCColor.separator, lineWidth: 1)
                        )
                    Text("O pedido ficará disponível para ministros da sua comunidade. A coordenação acompanha o fluxo.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                if let message = appModel.scheduleActionMessage {
                    Label(message, systemImage: message.contains("publicado") ? "checkmark.seal" : "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(message.contains("publicado") ? MESCColor.accent : MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                }

                MESCPrimaryButton(
                    title: appModel.isMutatingSchedule ? "Publicando..." : "Publicar pedido",
                    symbol: "paperplane.fill"
                ) {
                    Task {
                        let success = await appModel.requestSubstitution(
                            scheduleId: target.scheduleId,
                            reason: reason.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : reason
                        )
                        if success {
                            dismiss()
                        }
                    }
                }
                .disabled(appModel.isMutatingSchedule)

                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
        }
    }
}

struct SubstitutionCenterLink: View {
    let openCount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                SymbolTile(symbol: "arrow.triangle.2.circlepath", tint: MESCColor.gold)

                VStack(alignment: .leading, spacing: 3) {
                    Text("Trocas e substituições")
                        .font(MESCFont.cardTitle)
                        .foregroundStyle(MESCColor.textPrimary)
                    Text(openCount == 0 ? "Acompanhe seus pedidos ou ofereça ajuda." : String(openCount) + " pedido(s) aberto(s) para você ajudar.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .lineLimit(2)
                }

                Spacer(minLength: 8)

                if openCount > 0 {
                    Text("\(openCount)")
                        .font(.system(size: 13, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(minWidth: 25, minHeight: 25)
                        .background(MESCColor.primaryWine, in: Circle())
                }

                Image(systemName: "chevron.right")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(MESCColor.accent)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .mescGlass(cornerRadius: 20)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("Trocas e substituições")
    }
}

struct SubstitutionCenterSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var substitutionToClaim: MobileSubstitutionDTO?
    @State private var expandedGroupIDs = Set<String>()
    @State private var hasConfiguredInitialExpansion = false

    private var currentUserId: String {
        appModel.user?.id ?? ""
    }

    private var currentSubstitutions: [MobileSubstitutionDTO] {
        appModel.substitutions.filter { !isPastSchedule($0) }
    }

    private var previousSubstitutions: [MobileSubstitutionDTO] {
        appModel.substitutions.filter(isPastSchedule)
    }

    private var openRequests: [MobileSubstitutionDTO] {
        currentSubstitutions.filter(canClaim)
    }

    private var myRequests: [MobileSubstitutionDTO] {
        currentSubstitutions.filter { $0.requesterId == currentUserId }
    }

    private var acceptedRequests: [MobileSubstitutionDTO] {
        currentSubstitutions.filter {
            $0.substituteId == currentUserId && $0.requesterId != currentUserId
        }
    }

    private var openRequestGroups: [SubstitutionRequestGroup] {
        compactedGroups(openRequests)
    }

    private var myRequestGroups: [SubstitutionRequestGroup] {
        compactedGroups(myRequests)
    }

    private var acceptedRequestGroups: [SubstitutionRequestGroup] {
        compactedGroups(acceptedRequests)
    }

    private var currentGroups: [SubstitutionRequestGroup] {
        openRequestGroups + myRequestGroups + acceptedRequestGroups
    }

    private var previousRequestGroups: [SubstitutionRequestGroup] {
        compactedGroups(previousSubstitutions, ascending: false)
    }

    private var allGroups: [SubstitutionRequestGroup] {
        currentGroups + previousRequestGroups
    }

    private var allGroupIDs: Set<String> {
        Set(allGroups.map(\.id))
    }

    private var areAllGroupsExpanded: Bool {
        !allGroupIDs.isEmpty && allGroupIDs.isSubset(of: expandedGroupIDs)
    }

    var body: some View {
        ZStack {
            MESCBackground()

            substitutionList
        }
        .task {
            await appModel.loadSubstitutions()
            configureInitialGroupExpansion()
        }
        .refreshable {
            await appModel.loadSubstitutions()
        }
        .sheet(item: $substitutionToClaim) { substitution in
            SubstitutionClaimSheet(substitution: substitution)
                .environmentObject(appModel)
        }
    }

    @ViewBuilder
    private var substitutionList: some View {
        if #available(iOS 16.0, *) {
            substitutionListBody.scrollContentBackground(.hidden)
        } else {
            substitutionListBody
        }
    }

    private var substitutionListBody: some View {
        List {
            header.mescListRow(top: 22, bottom: 8)

            if appModel.isLoadingSubstitutions && appModel.substitutions.isEmpty {
                ProgressView()
                    .tint(MESCColor.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 48)
                    .mescListRow()
            } else {
                if let message = appModel.substitutionMessage {
                    Label(message, systemImage: "exclamationmark.triangle")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 4)
                        .mescListRow(top: 4, bottom: 2)
                }

                if !currentSubstitutions.isEmpty {
                    SectionTitle(title: "Atuais", symbol: "clock")
                        .padding(.horizontal, 4)
                        .mescListRow(top: 10, bottom: 2)
                } else if !previousSubstitutions.isEmpty {
                    GlassPanel(spacing: 8) {
                        SectionTitle(title: "Nenhuma troca atual", symbol: "checkmark.circle")
                        Text("Os pedidos de missas já realizadas permanecem no histórico abaixo.")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    .mescListRow()
                }

                if !openRequests.isEmpty {
                    SectionTitle(title: "Pedidos abertos", symbol: "person.2.badge.gearshape")
                        .padding(.horizontal, 4)
                        .mescListRow(top: 8, bottom: 2)

                    ForEach(openRequestGroups) { group in
                        SubstitutionRequestGroupHeader(group: group, isExpanded: expansionBinding(for: group))
                            .mescListRow(top: 4, bottom: 4)

                        if expandedGroupIDs.contains(group.id) {
                            ForEach(group.requests) { substitution in
                                SubstitutionRow(
                                    substitution: substitution,
                                    isOwnRequest: false,
                                    canClaim: true
                                ) {
                                    substitutionToClaim = substitution
                                }
                                .mescListRow(top: 2, bottom: 6)
                            }
                        }
                    }
                }

                if !myRequests.isEmpty {
                    SectionTitle(title: "Meus pedidos", symbol: "clock.arrow.circlepath")
                        .padding(.horizontal, 4)
                        .mescListRow(top: 10, bottom: 2)

                    ForEach(myRequestGroups) { group in
                        SubstitutionRequestGroupHeader(group: group, isExpanded: expansionBinding(for: group))
                            .mescListRow(top: 4, bottom: 4)

                        if expandedGroupIDs.contains(group.id) {
                            ForEach(group.requests) { substitution in
                                SubstitutionRow(
                                    substitution: substitution,
                                    isOwnRequest: true,
                                    canClaim: false
                                )
                                .mescListRow(top: 2, bottom: 6)
                            }
                        }
                    }
                }

                if !acceptedRequests.isEmpty {
                    SectionTitle(title: "Escalas que assumi", symbol: "checkmark.circle")
                        .padding(.horizontal, 4)
                        .mescListRow(top: 10, bottom: 2)

                    ForEach(acceptedRequestGroups) { group in
                        SubstitutionRequestGroupHeader(group: group, isExpanded: expansionBinding(for: group))
                            .mescListRow(top: 4, bottom: 4)

                        if expandedGroupIDs.contains(group.id) {
                            ForEach(group.requests) { substitution in
                                SubstitutionRow(
                                    substitution: substitution,
                                    isOwnRequest: false,
                                    canClaim: false
                                )
                                .mescListRow(top: 2, bottom: 6)
                            }
                        }
                    }
                }

                if !previousSubstitutions.isEmpty {
                    SectionTitle(title: "Anteriores", symbol: "clock.arrow.circlepath")
                        .padding(.horizontal, 4)
                        .mescListRow(top: 12, bottom: 2)
                    Text("Trocas de missas já realizadas, da mais recente para a mais antiga.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .padding(.horizontal, 4)
                        .mescListRow(top: 0, bottom: 4)

                    ForEach(previousRequestGroups) { group in
                        SubstitutionRequestGroupHeader(group: group, isExpanded: expansionBinding(for: group))
                            .mescListRow(top: 4, bottom: 4)

                        if expandedGroupIDs.contains(group.id) {
                            ForEach(group.requests) { substitution in
                                SubstitutionRow(
                                    substitution: substitution,
                                    isOwnRequest: substitution.requesterId == currentUserId,
                                    canClaim: false
                                )
                                .mescListRow(top: 2, bottom: 6)
                            }
                        }
                    }
                }

                if appModel.substitutions.isEmpty {
                    GlassPanel(spacing: 10) {
                        EmptyState(
                            title: "Nenhuma substituição por enquanto",
                            detail: "Quando um ministro pedir ajuda na sua comunidade, o pedido aparecerá aqui."
                        )
                    }
                    .mescListRow()
                }
            }
        }
        .listStyle(.plain)
        .environment(\.defaultMinListRowHeight, 0)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text("Escalas")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
                Text("Trocas e substituições")
                    .font(MESCFont.screenTitle)
                    .foregroundStyle(MESCColor.textPrimary)
            }

            Spacer()

            MESCIconButton(
                symbol: areAllGroupsExpanded ? "rectangle.compress.vertical" : "rectangle.expand.vertical",
                accessibilityLabel: areAllGroupsExpanded ? "Recolher todos os pedidos" : "Expandir todos os pedidos",
                isDisabled: allGroupIDs.isEmpty
            ) {
                toggleAllGroups()
            }

            MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar substituições") {
                dismiss()
            }
        }
        .padding(16)
        .mescGlass(cornerRadius: 24, intensity: .floating)
    }

    private func canClaim(_ substitution: MobileSubstitutionDTO) -> Bool {
        let isOpen = substitution.status == "available" || (substitution.status == "pending" && substitution.substituteId == nil)
        return isOpen && substitution.requesterId != currentUserId
    }

    private func compactedGroups(
        _ substitutions: [MobileSubstitutionDTO],
        ascending: Bool = true
    ) -> [SubstitutionRequestGroup] {
        let grouped = Dictionary(grouping: substitutions) { substitution in
            "\(substitution.schedule.date)|\(substitution.schedule.time)"
        }

        return grouped.values.compactMap { requests in
            guard let first = requests.first else { return nil }
            return SubstitutionRequestGroup(
                id: "\(first.schedule.date)|\(first.schedule.time)",
                date: first.schedule.date,
                time: first.schedule.time,
                requests: requests.sorted { ($0.createdAt ?? "") > ($1.createdAt ?? "") }
            )
        }
        .sorted {
            let dateComparison = $0.date.localizedCompare($1.date)
            if dateComparison == .orderedSame {
                return ascending ? $0.time < $1.time : $0.time > $1.time
            }
            return ascending ? dateComparison == .orderedAscending : dateComparison == .orderedDescending
        }
    }

    private func isPastSchedule(_ substitution: MobileSubstitutionDTO) -> Bool {
        MESCNativeAppModel.scheduleHasPassed(
            date: substitution.schedule.date,
            time: substitution.schedule.time
        )
    }

    private func expansionBinding(for group: SubstitutionRequestGroup) -> Binding<Bool> {
        Binding(
            get: { expandedGroupIDs.contains(group.id) },
            set: { isExpanded in
                if isExpanded {
                    expandedGroupIDs.insert(group.id)
                } else {
                    expandedGroupIDs.remove(group.id)
                }
            }
        )
    }

    private func configureInitialGroupExpansion() {
        expandedGroupIDs.formIntersection(allGroupIDs)
        guard !hasConfiguredInitialExpansion else { return }
        expandedGroupIDs = Set(currentGroups.filter { $0.requests.count == 1 }.map(\.id))
        hasConfiguredInitialExpansion = true
    }

    private func toggleAllGroups() {
        withAnimation(.easeInOut(duration: 0.2)) {
            if areAllGroupsExpanded {
                expandedGroupIDs.removeAll()
            } else {
                expandedGroupIDs.formUnion(allGroupIDs)
            }
        }
    }
}

struct SubstitutionRequestGroup: Identifiable {
    let id: String
    let date: String
    let time: String
    let requests: [MobileSubstitutionDTO]
}

struct SubstitutionRequestGroupHeader: View {
    let group: SubstitutionRequestGroup
    @Binding private var isExpanded: Bool

    init(
        group: SubstitutionRequestGroup,
        isExpanded: Binding<Bool>
    ) {
        self.group = group
        _isExpanded = isExpanded
    }

    var body: some View {
        Button {
            withAnimation(.easeInOut(duration: 0.18)) {
                isExpanded.toggle()
            }
        } label: {
            HStack(spacing: 12) {
                SymbolTile(symbol: "calendar.badge.clock", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 3) {
                    Text(MESCNativeAppModel.scheduleDateTitle(date: group.date))
                        .font(MESCFont.body.weight(.semibold))
                    Text("às \(MESCNativeAppModel.timeLabel(group.time))")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
                Text(group.requests.count == 1 ? "1 pedido" : "\(group.requests.count) pedidos")
                    .font(MESCFont.caption.weight(.semibold))
                    .foregroundStyle(MESCColor.accent)
                Image(systemName: isExpanded ? "chevron.up" : "chevron.down")
                    .font(.system(size: 12, weight: .bold))
                    .foregroundStyle(MESCColor.accent)
            }
            .padding(15)
            .frame(maxWidth: .infinity, alignment: .leading)
            .mescGlass(cornerRadius: 20)
        }
        .buttonStyle(.plain)
        .accessibilityLabel("\(MESCNativeAppModel.scheduleDateTitle(date: group.date)), às \(MESCNativeAppModel.timeLabel(group.time))")
        .accessibilityValue(isExpanded ? "Expandido" : "Recolhido")
    }
}

struct SubstitutionRow: View {
    let substitution: MobileSubstitutionDTO
    let isOwnRequest: Bool
    let canClaim: Bool
    var onClaim: (() -> Void)?

    var body: some View {
        VStack(alignment: .leading, spacing: 13) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "arrow.triangle.2.circlepath", tint: urgencyTint)

                VStack(alignment: .leading, spacing: 4) {
                    Text(primaryTitle)
                        .font(MESCFont.cardTitle)
                        .foregroundStyle(MESCColor.textPrimary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text("\(MESCNativeAppModel.scheduleDateTitle(date: substitution.schedule.date)) às \(MESCNativeAppModel.timeLabel(substitution.schedule.time))")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer(minLength: 4)

                Text(statusTitle)
                    .font(MESCFont.caption2.weight(.bold))
                    .foregroundStyle(statusTint)
                    .multilineTextAlignment(.trailing)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Label(scheduleDetail, systemImage: "mappin.and.ellipse")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            if let reason = nonEmpty(substitution.reason) {
                Label(reason, systemImage: "text.bubble")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if let response = nonEmpty(substitution.responseMessage) {
                Label(response, systemImage: "checkmark.message")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
                    .fixedSize(horizontal: false, vertical: true)
            }

            if canClaim, let onClaim {
                MESCPrimaryButton(title: "Assumir esta escala", symbol: "checkmark.circle", action: onClaim)
            } else if isOwnRequest && substitution.status == "available" {
                Label("Aguardando um ministro assumir esta escala.", systemImage: "clock")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.gold)
            } else if let substitute = substitution.substitute {
                Label("Assumida por \(substitute.name)", systemImage: "person.crop.circle.badge.checkmark")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
            }
        }
        .padding(15)
        .frame(maxWidth: .infinity, alignment: .leading)
        .mescGlass(cornerRadius: 20)
    }

    private var primaryTitle: String {
        if isOwnRequest {
            return "Seu pedido de substituição"
        }
        return "Pedido de \(substitution.requester?.name ?? "ministro da comunidade")"
    }

    private var scheduleDetail: String {
        let type = MESCNativeAppModel.scheduleTitle(type: substitution.schedule.type)
        if let location = nonEmpty(substitution.schedule.location) {
            return "\(type) • \(location)"
        }
        return type
    }

    private var statusTitle: String {
        switch substitution.status {
        case "available": return "Disponível"
        case "pending": return "Em análise"
        case "approved": return "Confirmada"
        case "rejected": return "Não aprovada"
        case "cancelled": return "Cancelada"
        default: return substitution.status.capitalized
        }
    }

    private var urgencyTint: Color {
        switch substitution.urgency {
        case "critical", "high": return MESCColor.primaryWine
        case "medium": return MESCColor.gold
        default: return MESCColor.accent
        }
    }

    private var statusTint: Color {
        switch substitution.status {
        case "approved": return MESCColor.accent
        case "available": return urgencyTint
        case "rejected", "cancelled": return MESCColor.primaryWine
        default: return MESCColor.textSecondary
        }
    }

    private func nonEmpty(_ value: String?) -> String? {
        guard let value = value?.trimmingCharacters(in: .whitespacesAndNewlines), !value.isEmpty else { return nil }
        return value
    }
}

struct SubstitutionClaimSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let substitution: MobileSubstitutionDTO
    @State private var message = ""

    var body: some View {
        ZStack {
            MESCBackground()

            VStack(alignment: .leading, spacing: 18) {
                GlassPanel(spacing: 12) {
                    HStack(alignment: .top, spacing: 12) {
                        SymbolTile(symbol: "checkmark.circle", tint: MESCColor.accent)
                        VStack(alignment: .leading, spacing: 5) {
                            Text("Assumir substituição")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.accent)
                            Text(MESCNativeAppModel.scheduleDateTitle(date: substitution.schedule.date))
                                .font(MESCFont.title2)
                            Text("às \(MESCNativeAppModel.timeLabel(substitution.schedule.time))")
                                .font(MESCFont.body)
                                .foregroundStyle(MESCColor.textSecondary)
                        }
                        Spacer()
                        MESCIconButton(symbol: "xmark", accessibilityLabel: "Cancelar aceite") {
                            dismiss()
                        }
                    }
                }

                GlassPanel(spacing: 10) {
                    SectionTitle(title: "Confirmação", symbol: "person.2")
                    Text("Você assumirá esta escala em nome de \(substitution.requester?.name ?? "um ministro da comunidade"). A atualização será registrada para a coordenação.")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)

                    TextField("Mensagem opcional", text: $message)
                        .font(MESCFont.body)
                        .padding(14)
                        .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(MESCColor.separator, lineWidth: 1)
                        )
                }

                if let statusMessage = appModel.scheduleActionMessage {
                    Label(statusMessage, systemImage: statusMessage.contains("confirmada") ? "checkmark.seal" : "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(statusMessage.contains("confirmada") ? MESCColor.accent : MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                }

                MESCPrimaryButton(
                    title: appModel.isMutatingSchedule ? "Confirmando..." : "Confirmar substituição",
                    symbol: "checkmark.circle.fill"
                ) {
                    Task {
                        let didClaim = await appModel.claimSubstitution(
                            id: substitution.id,
                            message: message.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty ? nil : message
                        )
                        if didClaim {
                            dismiss()
                        }
                    }
                }
                .disabled(appModel.isMutatingSchedule)

                Spacer()
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
        }
    }
}

struct QuestionnaireQuestionCard: View {
    let question: MobileQuestionnaireQuestionDTO
    @Binding var draft: QuestionnaireDraftAnswer

    var body: some View {
        GlassPanel(spacing: 14) {
            VStack(alignment: .leading, spacing: 5) {
                HStack(alignment: .firstTextBaseline, spacing: 5) {
                    Text(question.title)
                        .font(MESCFont.cardTitle)
                    if question.required == true {
                        Text("*")
                            .font(MESCFont.cardTitle)
                            .foregroundStyle(MESCColor.primaryWine)
                    }
                }
                Text(questionTypeLabel)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }

            switch question.type.lowercased() {
            case "checkbox", "multiple_select", "multi_select":
                VStack(spacing: 10) {
                    ForEach(question.options ?? [], id: \.self) { option in
                        ChoiceRow(title: option, isSelected: draft.multi.contains(option)) {
                            var value = draft
                            if value.multi.contains(option) {
                                value.multi.remove(option)
                            } else {
                                value.multi.insert(option)
                            }
                            draft = value
                        }
                    }
                }
            case "time_selection":
                VStack(spacing: 10) {
                    ForEach(question.options ?? [], id: \.self) { option in
                        ChoiceRow(title: option, isSelected: draft.multi.contains(option)) {
                            var value = draft
                            if value.multi.contains(option) {
                                value.multi.remove(option)
                            } else {
                                value.multi.insert(option)
                            }
                            draft = value
                        }
                    }
                }
            case "yes_no_with_options":
                VStack(alignment: .leading, spacing: 10) {
                    ForEach(question.options ?? [], id: \.self) { option in
                        ChoiceRow(title: option, isSelected: draft.single == option) {
                            draft.single = option
                            if option.localizedCaseInsensitiveCompare("Não") == .orderedSame {
                                draft.conditionalOptions.removeAll()
                            }
                        }
                    }

                    if shouldShowConditionalOptions, !conditionalOptions.isEmpty {
                        Divider()
                            .opacity(0.6)

                        Text("Selecione os horários ou dias que se aplicam")
                            .font(MESCFont.caption.weight(.semibold))
                            .foregroundStyle(MESCColor.textSecondary)

                        ForEach(conditionalOptions, id: \.self) { option in
                            ChoiceRow(title: option, isSelected: draft.conditionalOptions.contains(option)) {
                                var value = draft
                                if value.conditionalOptions.contains(option) {
                                    value.conditionalOptions.remove(option)
                                } else {
                                    value.conditionalOptions.insert(option)
                                }
                                draft = value
                            }
                        }
                    }
                }
            case "boolean", "switch":
                Toggle(isOn: Binding(
                    get: { draft.bool ?? false },
                    set: { draft.bool = $0 }
                )) {
                    Text("Sim")
                        .font(MESCFont.body)
                }
                .tint(MESCColor.accent)
            case "text", "textarea", "long_text":
                TextEditor(text: $draft.text)
                    .font(MESCFont.body)
                    .frame(minHeight: 112)
                    .padding(10)
                    .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(MESCColor.separator, lineWidth: 1)
                    )
            default:
                VStack(spacing: 10) {
                    ForEach(question.options ?? [], id: \.self) { option in
                        ChoiceRow(title: option, isSelected: draft.single == option) {
                            draft.single = option
                        }
                    }
                }
            }
        }
    }

    private var questionTypeLabel: String {
        switch question.type.lowercased() {
        case "checkbox", "multiple_select", "multi_select":
            return "Selecione uma ou mais opções"
        case "time_selection":
            return "Selecione os horários disponíveis"
        case "yes_no_with_options":
            return "Informe sua disponibilidade"
        case "boolean", "switch":
            return "Ative se a resposta for sim"
        case "text", "textarea", "long_text":
            return "Resposta livre"
        default:
            return "Selecione uma opção"
        }
    }

    private var conditionalOptions: [String] {
        question.metadata?.objectValue?["conditionalOptions"]?.arrayValue?.compactMap(\.stringValue) ?? []
    }

    private var shouldShowConditionalOptions: Bool {
        guard let answer = draft.single?.trimmingCharacters(in: .whitespacesAndNewlines), !answer.isEmpty else {
            return false
        }
        return answer.localizedCaseInsensitiveCompare("Não") != .orderedSame
    }
}

struct ChoiceRow: View {
    let title: String
    let isSelected: Bool
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(spacing: 12) {
                Image(systemName: isSelected ? "checkmark.circle.fill" : "circle")
                    .font(.system(size: 21, weight: .semibold))
                    .foregroundStyle(isSelected ? MESCColor.accent : MESCColor.textSecondary)
                Text(title)
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textPrimary)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
            .padding(13)
            .background(MESCColor.surface.opacity(isSelected ? 0.88 : 0.62), in: RoundedRectangle(cornerRadius: 15, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 15, style: .continuous)
                    .stroke(isSelected ? MESCColor.gold.opacity(0.34) : MESCColor.separator, lineWidth: 1)
            )
        }
        .buttonStyle(.plain)
    }
}

struct QuestionnaireDraftAnswer: Equatable {
    var single: String?
    var multi: Set<String> = []
    var text = ""
    var bool: Bool?
    var conditionalOptions: Set<String> = []

    init() {}

    init(answer: JSONValue, for question: MobileQuestionnaireQuestionDTO) {
        switch question.type.lowercased() {
        case "checkbox", "multiple_select", "multi_select", "time_selection":
            multi = Set(answer.arrayValue?.compactMap(\.stringValue) ?? [])
        case "boolean", "switch":
            bool = answer.boolValue
        case "text", "textarea", "long_text":
            text = answer.stringValue ?? ""
        case "yes_no_with_options":
            if let object = answer.objectValue {
                single = object["answer"]?.stringValue
                conditionalOptions = Set(object["selectedOptions"]?.arrayValue?.compactMap(\.stringValue) ?? [])
            } else {
                single = answer.stringValue
            }
        default:
            single = answer.stringValue
        }
    }

    var comparisonValue: String? {
        single ?? (bool == true ? "Sim" : bool == false ? "Não" : nil)
    }

    func isEmpty(for question: MobileQuestionnaireQuestionDTO) -> Bool {
        switch question.type.lowercased() {
        case "checkbox", "multiple_select", "multi_select", "time_selection":
            return multi.isEmpty
        case "boolean", "switch":
            return bool == nil
        case "text", "textarea", "long_text":
            return text.trimmingCharacters(in: .whitespacesAndNewlines).isEmpty
        default:
            return (single ?? "").isEmpty
        }
    }

    func answerValue(for question: MobileQuestionnaireQuestionDTO) -> JSONValue {
        switch question.type.lowercased() {
        case "checkbox", "multiple_select", "multi_select", "time_selection":
            return .array(multi.sorted().map { .string($0) })
        case "yes_no_with_options":
            return .object([
                "answer": .string(single ?? ""),
                "selectedOptions": .array(conditionalOptions.sorted().map { .string($0) }),
            ])
        case "boolean", "switch":
            return .bool(bool ?? false)
        case "text", "textarea", "long_text":
            return .string(text.trimmingCharacters(in: .whitespacesAndNewlines))
        default:
            return .string(single ?? "")
        }
    }
}

enum ScheduleMode: String, CaseIterable, Identifiable {
    case mine = "Minha Escala"
    case month = "Mês"
    case full = "Escala Completa"

    var id: String { rawValue }

    var symbol: String {
        switch self {
        case .mine: return "person.crop.circle.badge.checkmark"
        case .month: return "calendar"
        case .full: return "tablecells"
        }
    }

    var detail: String {
        switch self {
        case .mine: return "Seus turnos"
        case .month: return "Calendário da comunidade"
        case .full: return "Lista oficial do mês"
        }
    }
}

private struct ScheduleDetailDestination: Identifiable {
    let mission: ScheduleMission
    let dayTitle: String

    var id: String { mission.id }
}

struct SchedulesScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var mode: ScheduleMode = .mine
    @State private var selectedDayNumber = Calendar.current.component(.day, from: Date())
    @State private var substitutionTarget: SubstitutionTarget?
    @State private var isSubstitutionCenterPresented = false
    @State private var shareFile: ShareFile?
    @State private var scheduleDetail: ScheduleDetailDestination?

    var body: some View {
        let days = appModel.scheduleDays(for: mode)
        let selectedDay = days.first(where: { $0.dayNumber == selectedDayNumber }) ?? days.first ?? ScheduleFixtures.days[0]
        MESCScrollScreen(title: "Escalas", subtitle: appModel.currentMonthLabel) {
            if appModel.isUsingFallbackData {
                FallbackBanner()
            }

            MESCGlassSegmentedControl(
                options: ScheduleMode.allCases,
                selection: $mode,
                title: { $0.rawValue },
                symbol: { $0.symbol }
            )

            GlassPanel(spacing: 14) {
                HStack(alignment: .center, spacing: 12) {
                    MESCIconButton(symbol: "chevron.left", accessibilityLabel: "Mês anterior", isDisabled: appModel.isLoading) {
                        Task { await appModel.shiftScheduleMonth(by: -1) }
                    }

                    Spacer()
                    VStack(spacing: 4) {
                        Text(appModel.currentMonthLabel)
                            .font(MESCFont.cardTitle)
                        Text(mode.detail)
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()

                    MESCIconButton(symbol: "chevron.right", accessibilityLabel: "Próximo mês", isDisabled: appModel.isLoading) {
                        Task { await appModel.shiftScheduleMonth(by: 1) }
                    }
                }

                if mode != .full {
                    CalendarMonthGrid(
                        monthDate: appModel.currentMonthStartDate,
                        days: days,
                        selectedDay: selectedDay,
                        onSelect: { selectedDayNumber = $0.dayNumber }
                    )
                }
            }

            if mode == .full {
                ScheduleOfficialList(days: days) { mission, day in
                    scheduleDetail = ScheduleDetailDestination(
                        mission: mission,
                        dayTitle: day.formattedTitle
                    )
                }
            } else {
                ScheduleDayPanel(
                    day: selectedDay,
                    mode: mode,
                    onConfirm: { mission in
                        Task { await appModel.confirmSchedule(scheduleId: mission.scheduleId ?? mission.id) }
                    },
                    onRequestSubstitution: { mission in
                        substitutionTarget = SubstitutionTarget(
                            id: mission.id,
                            scheduleId: mission.scheduleId ?? mission.id,
                            title: "\(selectedDay.formattedTitle) às \(mission.time)",
                            subtitle: "\(mission.title) - \(mission.community)"
                        )
                    },
                    onOpenDetails: { mission in
                        scheduleDetail = ScheduleDetailDestination(
                            mission: mission,
                            dayTitle: selectedDay.formattedTitle
                        )
                    }
                )
            }

            SubstitutionCenterLink(
                openCount: currentOpenSubstitutionCount
            ) {
                isSubstitutionCenterPresented = true
            }

            if mode == .full {
                GlassPanel(spacing: 12) {
                    if let message = appModel.scheduleActionMessage {
                        Label(message, systemImage: message.contains("sucesso") || message.contains("publicado") ? "checkmark.seal" : "info.circle")
                            .font(MESCFont.caption)
                            .foregroundStyle(message.contains("sucesso") || message.contains("publicado") ? MESCColor.accent : MESCColor.primaryWine)
                            .fixedSize(horizontal: false, vertical: true)
                    }

                    MESCSecondaryButton(title: "Exportar modelo oficial", symbol: "square.and.arrow.up") {
                        do {
                            shareFile = ShareFile(url: try appModel.createOfficialScheduleExport())
                        } catch {
                            appModel.scheduleActionMessage = MESCMobileAPIClient.userMessage(for: error)
                        }
                    }
                }
            }
        }
        .sheet(item: $substitutionTarget) { target in
            SubstitutionRequestSheet(target: target)
                .environmentObject(appModel)
        }
        .sheet(isPresented: $isSubstitutionCenterPresented) {
            SubstitutionCenterSheet()
                .environmentObject(appModel)
        }
        .sheet(item: $shareFile) { file in
            ActivityView(activityItems: [file.url])
        }
        .sheet(item: $scheduleDetail) { destination in
            ScheduleMassDetailSheet(
                mission: destination.mission,
                dayTitle: destination.dayTitle,
                onConfirm: destination.mission.canConfirm && destination.mission.isCurrentUser ? {
                    Task { await appModel.confirmSchedule(scheduleId: destination.mission.scheduleId ?? destination.mission.id) }
                } : nil,
                onRequestSubstitution: destination.mission.canRequestSubstitution && destination.mission.isCurrentUser ? {
                    substitutionTarget = SubstitutionTarget(
                        id: destination.mission.id,
                        scheduleId: destination.mission.scheduleId ?? destination.mission.id,
                        title: "\(destination.dayTitle) às \(destination.mission.time)",
                        subtitle: "\(destination.mission.title) - \(destination.mission.community)"
                    )
                } : nil
            )
            .environmentObject(appModel)
        }
        .task {
            await appModel.loadSubstitutions()
            presentSubstitutionCenterIfRequested()
        }
        .onAppear {
            presentSubstitutionCenterIfRequested()
        }
        .onChange(of: appModel.isSubstitutionCenterPresentationRequested) { _ in
            presentSubstitutionCenterIfRequested()
        }
        .onChange(of: mode) { _ in
            selectedDayNumber = suggestedDayNumber(from: appModel.scheduleDays(for: mode))
        }
        .onChange(of: appModel.selectedMonth) { _ in
            selectedDayNumber = suggestedDayNumber(from: appModel.scheduleDays(for: mode))
        }
    }

    private var currentOpenSubstitutionCount: Int {
        appModel.substitutions.filter { substitution in
            let isOpen = substitution.status == "available" || (substitution.status == "pending" && substitution.substituteId == nil)
            return isOpen
                && substitution.requesterId != appModel.user?.id
                && !MESCNativeAppModel.scheduleHasPassed(
                    date: substitution.schedule.date,
                    time: substitution.schedule.time
                )
        }.count
    }

    private func suggestedDayNumber(from days: [ScheduleDay]) -> Int {
        if let firstWithMission = days.first(where: { !$0.missions.isEmpty }) {
            return firstWithMission.dayNumber
        }
        return days.first?.dayNumber ?? Calendar.current.component(.day, from: Date())
    }

    private func presentSubstitutionCenterIfRequested() {
        guard appModel.isSubstitutionCenterPresentationRequested else { return }
        appModel.isSubstitutionCenterPresentationRequested = false
        isSubstitutionCenterPresented = true
    }
}

struct ScheduleOfficialList: View {
    let days: [ScheduleDay]
    let onOpenDetails: (ScheduleMission, ScheduleDay) -> Void

    private var publishedDays: [ScheduleDay] {
        days.filter { !$0.missions.isEmpty }
    }

    var body: some View {
        if publishedDays.isEmpty {
            EmptyState(
                title: "Nenhuma escala publicada",
                detail: "Quando a coordenação publicar a escala deste mês, ela aparecerá aqui."
            )
        } else {
            VStack(alignment: .leading, spacing: 12) {
                SectionTitle(title: "Escala oficial", symbol: "list.bullet.rectangle")
                ForEach(publishedDays) { day in
                    VStack(alignment: .leading, spacing: 10) {
                        Text(day.formattedTitle)
                            .font(MESCFont.subheadline.weight(.semibold))
                            .foregroundStyle(MESCColor.textPrimary)
                            .padding(.horizontal, 4)

                        ForEach(day.missions) { mission in
                            ScheduleMissionRow(mission: mission) {
                                onOpenDetails(mission, day)
                            }
                        }
                    }
                }
            }
        }
    }
}

struct ScheduleDayPanel: View {
    let day: ScheduleDay
    let mode: ScheduleMode
    let onConfirm: (ScheduleMission) -> Void
    let onRequestSubstitution: (ScheduleMission) -> Void
    let onOpenDetails: (ScheduleMission) -> Void

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                VStack(alignment: .leading, spacing: 4) {
                    Text(day.formattedTitle)
                        .font(MESCFont.title2)
                        .foregroundStyle(MESCColor.textPrimary)
                    Text(day.missions.isEmpty ? "Nenhuma missa publicada para esta data." : daySummary)
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
            }

            if day.missions.isEmpty {
                EmptyState(title: "Sem escala nesta data", detail: "Toque em outro dia do calendário para consultar a escala publicada.")
            } else {
                VStack(spacing: 10) {
                    ForEach(day.missions) { mission in
                        ScheduleMissionRow(
                            mission: mission,
                            onOpenDetails: {
                                onOpenDetails(mission)
                            }
                        )
                    }
                }
            }
        }
    }

    private var daySummary: String {
        let massLabel = day.missions.count == 1 ? "1 missa publicada" : "\(day.missions.count) missas publicadas"
        switch mode {
        case .mine:
            return "\(massLabel) para você"
        case .month, .full:
            return massLabel
        }
    }
}

struct CalendarMonthGrid: View {
    let monthDate: Date
    let days: [ScheduleDay]
    let selectedDay: ScheduleDay
    let onSelect: (ScheduleDay) -> Void

    private let columns = Array(repeating: GridItem(.flexible(), spacing: 8), count: 7)
    private let weekdayLabels = ["D", "S", "T", "Q", "Q", "S", "S"]

    var body: some View {
        VStack(spacing: 10) {
            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(weekdayLabels, id: \.self) { label in
                    Text(label)
                        .font(.system(size: 12, weight: .semibold))
                        .foregroundStyle(MESCColor.textSecondary)
                        .frame(height: 22)
                }
            }

            LazyVGrid(columns: columns, spacing: 8) {
                ForEach(0..<leadingBlankDays, id: \.self) { _ in
                    Color.clear.frame(height: 42)
                }

                ForEach(days) { day in
                    Button {
                        onSelect(day)
                    } label: {
                        let isSelected = selectedDay.id == day.id
                        let hasMission = !day.missions.isEmpty

                        VStack(spacing: 3) {
                            Text("\(day.dayNumber)")
                                .font(.system(size: 16, weight: isSelected ? .bold : .medium))
                            Circle()
                                .fill(hasMission ? (isSelected ? Color.white : MESCColor.gold) : Color.clear)
                                .frame(width: 5, height: 5)
                        }
                        .frame(maxWidth: .infinity)
                        .frame(height: 42)
                        .foregroundStyle(isSelected ? .white : MESCColor.textPrimary)
                        .background {
                            ZStack {
                                if hasMission && !isSelected {
                                    RoundedRectangle(cornerRadius: 12, style: .continuous)
                                        .fill(.ultraThinMaterial)
                                }

                                RoundedRectangle(cornerRadius: 12, style: .continuous)
                                    .fill(isSelected ? MESCColor.primaryWine : (hasMission ? MESCColor.gold.opacity(0.10) : Color.clear))
                            }
                        }
                        .overlay {
                            RoundedRectangle(cornerRadius: 12, style: .continuous)
                                .stroke(isSelected ? MESCColor.gold.opacity(0.34) : (hasMission ? MESCColor.gold.opacity(0.18) : MESCColor.separator.opacity(0.18)), lineWidth: 1)
                        }
                    }
                    .buttonStyle(.plain)
                }
            }
        }
    }

    private var leadingBlankDays: Int {
        let weekday = Calendar.current.component(.weekday, from: monthDate)
        return max(weekday - 1, 0)
    }
}

struct FormationScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var isLessonPresented = false
    @State private var isFormationResourcesPresented = false
    @State private var isStudioPresented = false
    @State private var selectedModule: FormationModuleSelection?

    var body: some View {
        MESCListScreen(title: "Formação", subtitle: "Caminho de preparo e serviço") {
            if let overview = appModel.formationOverview, overview.summary.totalLessons > 0 {
                FormationOverviewPanel(
                    overview: overview,
                    isLoadingLesson: appModel.isLoadingFormationLesson,
                    onOpenLesson: openLesson
                )
                .mescListRow(top: 8, bottom: 6)

                FormationActionStrip(
                    videoCount: appModel.formationVideoLessons.count,
                    materialCount: appModel.formationLibraryMaterials.count,
                    certificateCount: appModel.formationCertificates.count,
                    canManageFormation: appModel.canManageFormation,
                    onOpenResources: { isFormationResourcesPresented = true },
                    onOpenStudio: { isStudioPresented = true }
                )
                .mescListRow(top: 6, bottom: 10)

                ForEach(overview.tracks) { track in
                    FormationTrackHeader(track: track)
                        .mescListRow(top: 8, bottom: 4)

                    ForEach(track.modules) { module in
                        FormationModuleListRow(module: module) {
                            selectedModule = FormationModuleSelection(trackTitle: track.title, module: module)
                        }
                        .mescListRow(top: 2, bottom: 6)
                    }
                }
            } else {
                GlassPanel(spacing: 14) {
                    SectionTitle(
                        title: appModel.isLoadingFormationOverview ? "Carregando formação" : "Formação indisponível",
                        symbol: appModel.isLoadingFormationOverview ? "book.pages" : "wifi.exclamationmark"
                    )
                    if appModel.isLoadingFormationOverview {
                        ProgressView()
                            .tint(MESCColor.accent)
                            .frame(maxWidth: .infinity, alignment: .center)
                    } else {
                        EmptyState(
                            title: "As aulas ainda não apareceram",
                            detail: "Atualize para buscar novamente as trilhas disponíveis."
                        )
                        MESCSecondaryButton(title: "Atualizar", symbol: "arrow.clockwise") {
                            Task { await appModel.refreshFormation() }
                        }
                    }
                }
                .mescListRow(top: 8, bottom: 6)
            }

            if let message = appModel.formationMessage {
                Label(message, systemImage: message.contains("sucesso") ? "checkmark.seal" : "info.circle")
                    .font(MESCFont.caption)
                    .foregroundStyle(message.contains("sucesso") ? MESCColor.accent : MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
                    .mescListRow(top: 4, bottom: 12)
            }
        }
        .sheet(isPresented: $isLessonPresented, onDismiss: {
            appModel.formationLessonDetail = nil
        }) {
            FormationLessonSheet()
                .environmentObject(appModel)
        }
        .sheet(isPresented: $isFormationResourcesPresented) {
            FormationResourcesSheet(onOpenLesson: openLesson)
                .environmentObject(appModel)
        }
        .sheet(isPresented: $isStudioPresented) {
            FormationAdminStudioSheet()
                .environmentObject(appModel)
        }
        .sheet(item: $selectedModule) { selection in
            FormationModuleSheet(trackTitle: selection.trackTitle, module: selection.module) { lesson in
                selectedModule = nil
                DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                    openLesson(lesson)
                }
            }
            .environmentObject(appModel)
        }
        .task {
            guard appModel.formationOverview == nil, !appModel.isLoadingFormationOverview else { return }
            await appModel.refreshFormation()
        }
    }

    private func openLesson(_ lesson: MobileFormationLessonDTO) {
        Task {
            let didOpen = await appModel.openFormationLesson(lesson)
            if didOpen {
                isLessonPresented = true
            }
        }
    }
}

private struct FormationModuleSelection: Identifiable {
    let trackTitle: String
    let module: MobileFormationModuleDTO

    var id: String { module.id }
}

struct FormationOverviewPanel: View {
    let overview: MobileFormationOverviewDTO
    let isLoadingLesson: Bool
    let onOpenLesson: (MobileFormationLessonDTO) -> Void

    private var nextLesson: MobileFormationLessonDTO? {
        overview.tracks.compactMap(\.nextLesson).first
    }

    var body: some View {
        GlassPanel(spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "graduationcap", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 5) {
                    Text("Formação contínua")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text("\(overview.summary.percentageCompleted)% concluído")
                        .font(MESCFont.title2)
                        .foregroundStyle(MESCColor.textPrimary)
                    Text("\(overview.summary.completedLessons) de \(overview.summary.totalLessons) aulas concluídas")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
            }

            ProgressView(value: Double(overview.summary.percentageCompleted), total: 100)
                .tint(MESCColor.accent)

            HStack(spacing: 10) {
                StatusPill(title: "\(overview.summary.totalTracks) trilhas", symbol: "map", tint: MESCColor.accent)
                StatusPill(title: "\(overview.summary.totalModules) módulos", symbol: "folder", tint: MESCColor.gold)
                StatusPill(title: "\(overview.summary.totalLessons) aulas", symbol: "book.closed", tint: MESCColor.primaryWine)
            }

            if let nextLesson {
                Divider().opacity(0.35)

                VStack(alignment: .leading, spacing: 10) {
                    SectionTitle(title: "Próxima aula", symbol: "play.circle")
                    Text(nextLesson.title)
                        .font(MESCFont.cardTitle)
                        .foregroundStyle(MESCColor.textPrimary)
                    Text("Aula \(nextLesson.lessonNumber)\(nextLesson.estimatedDuration.map { " - \($0) min" } ?? "")")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    MESCPrimaryButton(
                        title: isLoadingLesson ? "Abrindo..." : "Continuar",
                        symbol: "play.fill"
                    ) {
                        onOpenLesson(nextLesson)
                    }
                    .disabled(isLoadingLesson)
                }
            }
        }
    }
}

struct FormationActionStrip: View {
    let videoCount: Int
    let materialCount: Int
    let certificateCount: Int
    let canManageFormation: Bool
    let onOpenResources: () -> Void
    let onOpenStudio: () -> Void

    private var resourceSummary: String {
        let resourceCount = videoCount + materialCount
        let resourceLabel = resourceCount == 1 ? "1 recurso" : "\(resourceCount) recursos"
        return certificateCount > 0 ? "\(resourceLabel) · \(certificateCount) certificado(s)" : resourceLabel
    }

    var body: some View {
        HStack(spacing: 10) {
            FormationActionButton(
                title: "Biblioteca",
                subtitle: resourceSummary,
                symbol: "books.vertical",
                tint: MESCColor.accent,
                action: onOpenResources
            )

            if canManageFormation {
                FormationActionButton(
                    title: "Estúdio",
                    subtitle: "Coordenação",
                    symbol: "square.and.pencil",
                    tint: MESCColor.gold,
                    action: onOpenStudio
                )
            }
        }
    }
}

struct FormationActionButton: View {
    let title: String
    let subtitle: String
    let symbol: String
    let tint: Color
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            VStack(alignment: .leading, spacing: 8) {
                SymbolTile(symbol: symbol, tint: tint)
                Text(title)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                    .lineLimit(1)
                    .minimumScaleFactor(0.78)
                Text(subtitle)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }
            .frame(maxWidth: .infinity, alignment: .leading)
            .padding(14)
            .mescGlass(cornerRadius: 20, intensity: .floating)
        }
        .buttonStyle(.plain)
    }
}

struct FormationTrackHeader: View {
    let track: MobileFormationTrackDTO

    var body: some View {
        GlassPanel(spacing: 10) {
            SectionTitle(title: track.title, symbol: trackSymbol)
            if let description = track.description {
                Text(description)
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
            HStack(spacing: 10) {
                Text("\(track.stats.totalModules) módulos")
                Text("\(track.stats.totalLessons) aulas")
                Text("\(track.stats.progressPercentage)%")
            }
            .font(MESCFont.caption)
            .foregroundStyle(MESCColor.textSecondary)
            ProgressView(value: Double(track.stats.progressPercentage), total: 100)
                .tint(MESCColor.accent)
        }
    }

    private var trackSymbol: String {
        switch track.category {
        case "espiritualidade":
            return "sparkles"
        case "pratica", "prática":
            return "book.pages"
        default:
            return "book.closed"
        }
    }
}

struct FormationModuleListRow: View {
    let module: MobileFormationModuleDTO
    let onOpenModule: () -> Void

    var body: some View {
        Button(action: onOpenModule) {
            HStack(spacing: 12) {
                SymbolTile(
                    symbol: module.videoUrl == nil ? "book.closed" : "play.rectangle",
                    tint: module.stats.progressPercentage == 100 ? MESCColor.gold : MESCColor.accent
                )
                VStack(alignment: .leading, spacing: 6) {
                    Text(module.title)
                        .font(MESCFont.body.weight(.semibold))
                        .foregroundStyle(MESCColor.textPrimary)
                        .multilineTextAlignment(.leading)
                    Text("\(module.stats.completedLessons) de \(module.stats.totalLessons) aulas concluídas")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    ProgressView(value: Double(module.stats.progressPercentage), total: 100)
                        .tint(MESCColor.gold)
                }
                Spacer(minLength: 8)
                Image(systemName: "chevron.right")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MESCColor.textSecondary)
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .mescGlass(cornerRadius: 18)
        }
        .buttonStyle(.plain)
        .accessibilityHint("Abre as aulas deste módulo")
    }
}

struct FormationModuleSheet: View {
    @Environment(\.dismiss) private var dismiss
    let trackTitle: String
    let module: MobileFormationModuleDTO
    let onOpenLesson: (MobileFormationLessonDTO) -> Void

    var body: some View {
        ZStack {
            MESCBackground()

            lessonsList
        }
    }

    @ViewBuilder
    private var lessonsList: some View {
        if #available(iOS 16.0, *) {
            lessonsListBody.scrollContentBackground(.hidden)
        } else {
            lessonsListBody
        }
    }

    private var lessonsListBody: some View {
        List {
            GlassPanel(spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    SymbolTile(symbol: module.videoUrl == nil ? "book.closed" : "play.rectangle", tint: MESCColor.gold)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(trackTitle)
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.accent)
                        Text(module.title)
                            .font(MESCFont.title2)
                            .foregroundStyle(MESCColor.textPrimary)
                        Text("\(module.stats.completedLessons) de \(module.stats.totalLessons) aulas concluídas")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()
                    MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar módulo") {
                        dismiss()
                    }
                }

                if let description = module.description, !description.isEmpty {
                    Text(description)
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
            }
            .mescListRow(top: 22, bottom: 8)

            ForEach(module.lessons) { lesson in
                Button {
                    dismiss()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        onOpenLesson(lesson)
                    }
                } label: {
                    HStack(spacing: 12) {
                        SymbolTile(
                            symbol: lesson.progress?.status == "completed" ? "checkmark.seal.fill" : "play.circle.fill",
                            tint: lesson.progress?.status == "completed" ? MESCColor.gold : MESCColor.accent
                        )
                        VStack(alignment: .leading, spacing: 4) {
                            Text(lesson.title)
                                .font(MESCFont.body.weight(.semibold))
                                .foregroundStyle(MESCColor.textPrimary)
                                .multilineTextAlignment(.leading)
                            Text(lessonDetail(lesson))
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.textSecondary)
                        }
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .semibold))
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    .padding(14)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .mescGlass(cornerRadius: 18)
                }
                .buttonStyle(.plain)
                .mescListRow(top: 3, bottom: 5)
            }
        }
        .listStyle(.plain)
        .environment(\.defaultMinListRowHeight, 0)
    }

    private func lessonDetail(_ lesson: MobileFormationLessonDTO) -> String {
        let status: String
        switch lesson.progress?.status {
        case "completed": status = "Concluída"
        case "in_progress": status = "Em andamento"
        default: status = "Não iniciada"
        }
        return "\(status) - Aula \(lesson.lessonNumber)\(lesson.estimatedDuration.map { " - \($0) min" } ?? "")"
    }
}

struct FormationLessonSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var mediaTarget: FormationMediaTarget?
    @State private var quizTarget: FormationQuizDefinition?
    @State private var quizResults: [String: FormationQuizResult] = [:]

    var body: some View {
        ZStack {
            MESCBackground()

            if let detail = appModel.formationLessonDetail {
                ScrollView(showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: 18) {
                        header(detail)

                        if let description = detail.lesson.description, !description.isEmpty {
                            Text(description.mescPlainText)
                                .font(MESCFont.body)
                                .foregroundStyle(MESCColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(.horizontal, 4)
                        }

                        if let videoUrl = detail.lesson.videoUrl, let target = FormationMediaTarget(
                            title: detail.lesson.title,
                            urlString: videoUrl
                        ) {
                            Button {
                                mediaTarget = target
                            } label: {
                                Label("Abrir vídeo da aula", systemImage: "play.rectangle.fill")
                                    .font(MESCFont.body.weight(.semibold))
                                    .frame(maxWidth: .infinity, alignment: .leading)
                                    .padding(14)
                                    .mescGlass(cornerRadius: 16)
                            }
                            .buttonStyle(.plain)
                            .foregroundStyle(MESCColor.accent)
                        }

                        ForEach(detail.sections) { section in
                            FormationLessonSectionCard(
                                section: section,
                                isCompleted: detail.progress.completedSections?.contains(section.id) == true || detail.progress.status == "completed",
                                isCompleting: appModel.completingFormationSectionId == section.id,
                                isProgressMutationInFlight: appModel.isCompletingFormationLesson || appModel.completingFormationSectionId != nil,
                                isLessonCompleted: detail.progress.status == "completed",
                                quiz: FormationQuizDefinition(section: section),
                                quizResult: FormationQuizDefinition(section: section).flatMap { quizResults[$0.id] },
                                onComplete: {
                                    Task { await appModel.completeFormationLessonSection(sectionId: section.id) }
                                },
                                onOpenMedia: { mediaTarget = $0 },
                                onOpenQuiz: { quizTarget = $0 }
                            )
                        }

                        if detail.sections.isEmpty {
                            EmptyState(title: "Conteúdo em preparação", detail: "A coordenação ainda não publicou seções para esta aula.")
                        }

                        if let message = appModel.formationMessage {
                            Label(message, systemImage: message.contains("sucesso") ? "checkmark.seal" : "info.circle")
                                .font(MESCFont.caption)
                                .foregroundStyle(message.contains("sucesso") ? MESCColor.accent : MESCColor.primaryWine)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        if !quizRequirementSatisfied(for: detail) {
                            Label(
                                "Conclua o quiz de avaliação para marcar esta aula como concluída.",
                                systemImage: "questionmark.circle"
                            )
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.gold)
                            .fixedSize(horizontal: false, vertical: true)
                            .padding(14)
                            .frame(maxWidth: .infinity, alignment: .leading)
                            .mescGlass(cornerRadius: 16)
                        }

                        MESCPrimaryButton(
                            title: completeButtonTitle(for: detail),
                            symbol: detail.progress.status == "completed" ? "checkmark.seal.fill" : "checkmark.circle"
                        ) {
                            Task { await appModel.completeCurrentFormationLesson() }
                        }
                        .disabled(
                            appModel.isCompletingFormationLesson
                                || appModel.completingFormationSectionId != nil
                                || detail.progress.status == "completed"
                                || !quizRequirementSatisfied(for: detail)
                        )

                        lessonNavigation(for: detail)
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 20)
                    .padding(.bottom, 34)
                }
            } else {
                EmptyState(title: "Aula não carregada", detail: "Toque em uma aula novamente.")
                    .padding(24)
            }
        }
        .sheet(item: $mediaTarget) { target in
            FormationMediaSheet(target: target)
        }
        .sheet(item: $quizTarget) { quiz in
            FormationQuizSheet(quiz: quiz) { result in
                quizResults[quiz.id] = result
            }
        }
        .onChange(of: appModel.formationLessonDetail?.id) { _ in
            quizResults = [:]
        }
    }

    private func header(_ detail: MobileFormationLessonDetailDTO) -> some View {
        GlassPanel(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: detail.progress.status == "completed" ? "checkmark.seal" : "play.circle", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Aula \(detail.lesson.lessonNumber)")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text(detail.lesson.title)
                        .font(MESCFont.title2)
                        .fixedSize(horizontal: false, vertical: true)
                    HStack(spacing: 10) {
                        Text(progressLabel(detail.progress))
                        if let duration = detail.lesson.estimatedDuration {
                            Text("\(duration) min")
                        }
                    }
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    ProgressView(value: Double(detail.progress.progressPercentage), total: 100)
                        .tint(MESCColor.gold)
                }
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MESCColor.textPrimary)
                        .frame(width: 34, height: 34)
                        .background(MESCColor.surface.opacity(0.72), in: Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func completeButtonTitle(for detail: MobileFormationLessonDetailDTO) -> String {
        if appModel.isCompletingFormationLesson {
            return "Concluindo..."
        }
        return detail.progress.status == "completed" ? "Aula concluída" : "Marcar como concluída"
    }

    private func progressLabel(_ progress: MobileFormationProgressDTO) -> String {
        switch progress.status {
        case "completed":
            return "Concluída"
        case "in_progress":
            return "\(progress.progressPercentage)% concluída"
        default:
            return "Não iniciada"
        }
    }

    private func quizRequirementSatisfied(for detail: MobileFormationLessonDetailDTO) -> Bool {
        let quizzes = detail.sections.compactMap(FormationQuizDefinition.init(section:))
        return quizzes.allSatisfy { quizResults[$0.id]?.passed == true }
    }

    @ViewBuilder
    private func lessonNavigation(for detail: MobileFormationLessonDetailDTO) -> some View {
        let lessons = moduleLessons(for: detail)
        let currentIndex = lessons.firstIndex(where: { $0.id == detail.lesson.id })
        let previous = currentIndex.flatMap { $0 > 0 ? lessons[$0 - 1] : nil }
        let next = currentIndex.flatMap { $0 < lessons.count - 1 ? lessons[$0 + 1] : nil }

        if previous != nil || next != nil {
            HStack(spacing: 10) {
                MESCSecondaryButton(title: "Anterior", symbol: "chevron.left") {
                    if let previous {
                        openLesson(previous)
                    }
                }
                .disabled(previous == nil || appModel.isLoadingFormationLesson)
                .opacity(previous == nil ? 0.55 : 1)

                MESCSecondaryButton(title: "Próxima", symbol: "chevron.right") {
                    if let next {
                        openLesson(next)
                    }
                }
                .disabled(next == nil || appModel.isLoadingFormationLesson)
                .opacity(next == nil ? 0.55 : 1)
            }
        }
    }

    private func moduleLessons(for detail: MobileFormationLessonDetailDTO) -> [MobileFormationLessonDTO] {
        appModel.formationOverview?
            .tracks
            .flatMap(\.modules)
            .first(where: { $0.id == detail.lesson.moduleId })?
            .lessons
            .sorted { $0.lessonNumber < $1.lessonNumber } ?? []
    }

    private func openLesson(_ lesson: MobileFormationLessonDTO) {
        Task {
            _ = await appModel.openFormationLesson(lesson)
        }
    }
}

private enum FormationResourceTab: String, CaseIterable, Identifiable {
    case videos
    case materials
    case certificates

    var id: String { rawValue }

    var title: String {
        switch self {
        case .videos: return "Vídeos"
        case .materials: return "Materiais"
        case .certificates: return "Certificados"
        }
    }
}

private struct FormationPreviewFile: Identifiable {
    let url: URL

    var id: String { url.absoluteString }
}

struct FormationResourcesSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let onOpenLesson: (MobileFormationLessonDTO) -> Void
    @State private var selectedTab: FormationResourceTab = .videos
    @State private var openingResourceId: String?
    @State private var previewFile: FormationPreviewFile?

    var body: some View {
        ZStack {
            MESCBackground()

            resourcesList
        }
        .sheet(item: $previewFile) { file in
            FormationFilePreview(fileURL: file.url)
                .ignoresSafeArea()
        }
        .task {
            await appModel.refreshFormationResources()
            selectFirstAvailableTabIfNeeded()
        }
    }

    @ViewBuilder
    private var resourcesList: some View {
        if #available(iOS 16.0, *) {
            resourcesListBody.scrollContentBackground(.hidden)
        } else {
            resourcesListBody
        }
    }

    private var resourcesListBody: some View {
        List {
            GlassPanel(spacing: 12) {
                HStack(alignment: .top, spacing: 12) {
                    SymbolTile(symbol: "books.vertical", tint: MESCColor.gold)
                    VStack(alignment: .leading, spacing: 6) {
                        Text("Formação")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.accent)
                        Text("Biblioteca")
                            .font(MESCFont.title2)
                        Text("Vídeos, materiais e certificados do seu caminho de formação.")
                            .font(MESCFont.body)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(MESCColor.textPrimary)
                            .frame(width: 34, height: 34)
                            .background(MESCColor.surface.opacity(0.72), in: Circle())
                    }
                    .buttonStyle(.plain)
                }
            }
            .mescListRow(top: 22, bottom: 8)

            Picker("Conteúdo", selection: $selectedTab) {
                ForEach(FormationResourceTab.allCases) { tab in
                    Text(tab.title).tag(tab)
                }
            }
            .pickerStyle(.segmented)
            .mescListRow(top: 4, bottom: 8)

            switch selectedTab {
            case .videos:
                videoRows
            case .materials:
                materialRows
            case .certificates:
                certificateRows
            }
        }
        .listStyle(.plain)
        .environment(\.defaultMinListRowHeight, 0)
    }

    @ViewBuilder
    private var videoRows: some View {
        if appModel.formationVideoLessons.isEmpty {
            EmptyState(title: "Nenhum vídeo publicado", detail: "Os vídeos incluídos pela coordenação nas aulas aparecerão aqui.")
                .mescListRow()
        } else {
            ForEach(appModel.formationVideoLessons) { lesson in
                Button {
                    dismiss()
                    DispatchQueue.main.asyncAfter(deadline: .now() + 0.25) {
                        onOpenLesson(lesson)
                    }
                } label: {
                    FormationResourceRow(
                        symbol: "play.fill",
                        tint: MESCColor.accent,
                        title: lesson.title,
                        detail: "Aula \(lesson.lessonNumber)\(lesson.estimatedDuration.map { " · \($0) min" } ?? "")"
                    )
                }
                .buttonStyle(.plain)
                .mescListRow(top: 3, bottom: 5)
            }
        }
    }

    @ViewBuilder
    private var materialRows: some View {
        if appModel.isLoadingFormationResources, appModel.formationLibraryMaterials.isEmpty {
            ProgressView("Carregando materiais")
                .tint(MESCColor.accent)
                .mescListRow()
        } else if appModel.formationLibraryMaterials.isEmpty {
            EmptyState(title: "Nenhum material publicado", detail: "Quando a coordenação publicar um guia ou material de apoio, ele aparecerá aqui.")
                .mescListRow()
        } else {
            ForEach(appModel.formationLibraryMaterials) { material in
                Button {
                    open(material: material)
                } label: {
                    FormationResourceRow(
                        symbol: materialSymbol(material.type),
                        tint: MESCColor.gold,
                        title: material.title,
                        detail: materialDetail(material)
                    )
                    .overlay(alignment: .trailing) {
                        if openingResourceId == material.id {
                            ProgressView()
                                .tint(MESCColor.accent)
                                .padding(.trailing, 30)
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(openingResourceId != nil)
                .mescListRow(top: 3, bottom: 5)
            }
        }
    }

    @ViewBuilder
    private var certificateRows: some View {
        if appModel.isLoadingFormationResources, appModel.formationCertificates.isEmpty {
            ProgressView("Carregando certificados")
                .tint(MESCColor.accent)
                .mescListRow()
        } else if appModel.formationCertificates.isEmpty {
            EmptyState(title: "Nenhum certificado emitido", detail: "Ao concluir uma trilha certificável, seu documento aparecerá aqui.")
                .mescListRow()
        } else {
            ForEach(appModel.formationCertificates) { certificate in
                Button {
                    open(certificate: certificate)
                } label: {
                    FormationResourceRow(
                        symbol: "checkmark.seal",
                        tint: MESCColor.accent,
                        title: certificate.trackTitle,
                        detail: "Emitido em \(certificateDate(certificate.issuedAt))"
                    )
                    .overlay(alignment: .trailing) {
                        if openingResourceId == certificate.id {
                            ProgressView()
                                .tint(MESCColor.accent)
                                .padding(.trailing, 30)
                        }
                    }
                }
                .buttonStyle(.plain)
                .disabled(openingResourceId != nil)
                .mescListRow(top: 3, bottom: 5)
            }
        }
    }

    private func selectFirstAvailableTabIfNeeded() {
        if !appModel.formationVideoLessons.isEmpty { return }
        if !appModel.formationLibraryMaterials.isEmpty {
            selectedTab = .materials
        } else if !appModel.formationCertificates.isEmpty {
            selectedTab = .certificates
        }
    }

    private func open(material: MobileFormationMaterialDTO) {
        openingResourceId = material.id
        Task {
            let fileURL = await appModel.downloadFormationMaterial(material)
            previewFile = fileURL.map(FormationPreviewFile.init)
            openingResourceId = nil
        }
    }

    private func open(certificate: MobileFormationCertificateDTO) {
        openingResourceId = certificate.id
        Task {
            let fileURL = await appModel.downloadFormationCertificate(certificate)
            previewFile = fileURL.map(FormationPreviewFile.init)
            openingResourceId = nil
        }
    }

    private func materialSymbol(_ type: String) -> String {
        switch type.lowercased() {
        case "video": return "play.rectangle"
        case "audio": return "waveform"
        case "image": return "photo"
        case "presentation": return "rectangle.on.rectangle"
        case "pdf": return "doc.richtext"
        default: return "doc.text"
        }
    }

    private func materialDetail(_ material: MobileFormationMaterialDTO) -> String {
        let category = material.category?.capitalized ?? "Material de apoio"
        guard material.fileSize > 0 else { return category }
        return "\(category) · \(ByteCountFormatter.string(fromByteCount: Int64(material.fileSize), countStyle: .file))"
    }

    private func certificateDate(_ value: String) -> String {
        guard let date = ISO8601DateFormatter().date(from: value) else {
            return String(value.prefix(10))
        }
        return date.formatted(.dateTime.day().month(.wide).year())
    }
}

private struct FormationResourceRow: View {
    let symbol: String
    let tint: Color
    let title: String
    let detail: String

    var body: some View {
        HStack(spacing: 12) {
            SymbolTile(symbol: symbol, tint: tint)
            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                    .multilineTextAlignment(.leading)
                Text(detail)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .lineLimit(2)
            }
            Spacer(minLength: 8)
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MESCColor.textSecondary)
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .mescGlass(cornerRadius: 18)
    }
}

private struct FormationFilePreview: UIViewControllerRepresentable {
    let fileURL: URL

    func makeCoordinator() -> Coordinator {
        Coordinator(fileURL: fileURL)
    }

    func makeUIViewController(context: Context) -> QLPreviewController {
        let controller = QLPreviewController()
        controller.dataSource = context.coordinator
        return controller
    }

    func updateUIViewController(_ uiViewController: QLPreviewController, context: Context) {}

    final class Coordinator: NSObject, QLPreviewControllerDataSource {
        private let fileURL: URL

        init(fileURL: URL) {
            self.fileURL = fileURL
        }

        func numberOfPreviewItems(in controller: QLPreviewController) -> Int {
            1
        }

        func previewController(_ controller: QLPreviewController, previewItemAt index: Int) -> QLPreviewItem {
            fileURL as NSURL
        }
    }
}

struct FormationAdminStudioSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedModuleId = ""
    @State private var title = ""
    @State private var description = ""
    @State private var sectionContent = ""
    @State private var videoUrl = ""
    @State private var durationText = ""
    @State private var isActive = true
    @State private var materialTitle = ""
    @State private var materialDescription = ""
    @State private var materialURL = ""
    @State private var materialTags = ""
    @State private var materialType = "document"
    @State private var materialCategory = "pratica"
    @State private var isMaterialPublished = true
    @State private var selectedLessonForEditing: MobileFormationAdminLessonDTO?

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: 18) {
                    header

                    if let studio = appModel.formationAdminStudio {
                        summary(studio)
                        lessonForm
                        materialForm
                        recentLessons(studio)
                    } else if appModel.isLoadingFormationStudio {
                        GlassPanel(spacing: 12) {
                            SectionTitle(title: "Carregando estúdio", symbol: "hourglass")
                            ProgressView()
                                .tint(MESCColor.accent)
                        }
                    } else {
                        EmptyState(title: "Estúdio indisponível", detail: "Toque em atualizar para carregar trilhas, módulos e aulas.")
                    }

                    if let message = appModel.formationMessage {
                        Label(message, systemImage: message.contains("sucesso") || message.contains("salva") ? "checkmark.seal" : "info.circle")
                            .font(MESCFont.caption)
                            .foregroundStyle(message.contains("sucesso") || message.contains("salva") ? MESCColor.accent : MESCColor.primaryWine)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 34)
            }
        }
        .task {
            await appModel.loadFormationAdminStudio()
            selectDefaultModuleIfNeeded()
        }
        .onChange(of: moduleIds) { _ in
            selectDefaultModuleIfNeeded()
        }
        .sheet(item: $selectedLessonForEditing) { lesson in
            FormationAdminLessonEditorSheet(lesson: lesson) {
                selectedLessonForEditing = nil
            }
            .environmentObject(appModel)
        }
    }

    private var header: some View {
        GlassPanel(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "square.and.pencil", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 6) {
                    Text("Coordenação")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text("Estúdio de formação")
                        .font(MESCFont.title2)
                    Text("Publique aulas, vídeos e materiais de apoio sem sair do app.")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                Spacer()
                Button {
                    dismiss()
                } label: {
                    Image(systemName: "xmark")
                        .font(.system(size: 14, weight: .bold))
                        .foregroundStyle(MESCColor.textPrimary)
                        .frame(width: 34, height: 34)
                        .background(MESCColor.surface.opacity(0.72), in: Circle())
                }
                .buttonStyle(.plain)
            }
        }
    }

    private func summary(_ studio: MobileFormationAdminStudioDTO) -> some View {
        GlassPanel(spacing: 14) {
            SectionTitle(title: "Conteúdo publicado", symbol: "chart.bar.doc.horizontal")
            HStack(spacing: 10) {
                StatusPill(title: "\(studio.summary.totalLessons) aulas", symbol: "book.closed", tint: MESCColor.accent)
                StatusPill(title: "\(studio.summary.videoLessons) vídeos", symbol: "play.rectangle", tint: MESCColor.gold)
            }
            HStack(spacing: 10) {
                StatusPill(title: "\(studio.summary.totalModules) módulos", symbol: "folder", tint: MESCColor.primaryWine)
                StatusPill(title: "\(studio.summary.activeLessons) ativas", symbol: "checkmark.seal", tint: MESCColor.accent)
            }
        }
    }

    private var lessonForm: some View {
        GlassPanel(spacing: 14) {
            SectionTitle(title: "Nova aula", symbol: "plus.circle")

            if modules.isEmpty {
                EmptyState(title: "Nenhum módulo disponível", detail: "Crie ou ative módulos de formação antes de publicar novas aulas.")
            } else {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Módulo")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    Picker("Módulo", selection: $selectedModuleId) {
                        ForEach(modules) { module in
                            Text(module.title).tag(module.id)
                        }
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(MESCColor.gold.opacity(0.18), lineWidth: 1)
                    )
                }

                adminField("Título da aula", text: $title, placeholder: "Ex.: Cuidados no rito da comunhão")
                adminField("Descrição", text: $description, placeholder: "Resumo para os ministros")
                adminField("Duração em minutos", text: $durationText, placeholder: "Ex.: 12", keyboard: .numberPad)
                adminField("URL do vídeo", text: $videoUrl, placeholder: "https://...")

                VStack(alignment: .leading, spacing: 6) {
                    Text("Conteúdo inicial")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    TextEditor(text: $sectionContent)
                        .font(MESCFont.body)
                        .frame(minHeight: 112)
                        .padding(10)
                        .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                        .overlay(
                            RoundedRectangle(cornerRadius: 14, style: .continuous)
                                .stroke(MESCColor.separator, lineWidth: 1)
                        )
                }

                Toggle(isOn: $isActive) {
                    VStack(alignment: .leading, spacing: 3) {
                        Text("Publicar agora")
                            .font(MESCFont.body.weight(.semibold))
                        Text("Quando ativo, os ministros recebem aviso de novo treinamento.")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                }
                .tint(MESCColor.accent)
                .padding(12)
                .mescGlass(cornerRadius: 16)

                MESCPrimaryButton(
                    title: appModel.isSavingFormationContent ? "Salvando..." : "Salvar aula",
                    symbol: "tray.and.arrow.down"
                ) {
                    Task { await submitLesson() }
                }
                .disabled(appModel.isSavingFormationContent || selectedModuleId.isEmpty || trimmed(title).isEmpty)
                .opacity(appModel.isSavingFormationContent || selectedModuleId.isEmpty || trimmed(title).isEmpty ? 0.55 : 1)
            }
        }
    }

    private var materialForm: some View {
        GlassPanel(spacing: 14) {
            SectionTitle(title: "Material de apoio", symbol: "doc.badge.plus")
            Text("Publique uma URL de documento, vídeo ou referência para a biblioteca privada dos ministros.")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)

            adminField("Título do material", text: $materialTitle, placeholder: "Ex.: Checklist para a distribuição")
            adminField("Descrição", text: $materialDescription, placeholder: "Quando e como usar este material")

            HStack(spacing: 10) {
                VStack(alignment: .leading, spacing: 6) {
                    Text("Tipo")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    Picker("Tipo", selection: $materialType) {
                        Text("Documento").tag("document")
                        Text("PDF").tag("pdf")
                        Text("Vídeo").tag("video")
                        Text("Áudio").tag("audio")
                        Text("Apresentação").tag("presentation")
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }

                VStack(alignment: .leading, spacing: 6) {
                    Text("Área")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    Picker("Área", selection: $materialCategory) {
                        Text("Prática").tag("pratica")
                        Text("Liturgia").tag("liturgia")
                        Text("Espiritualidade").tag("espiritualidade")
                    }
                    .pickerStyle(.menu)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                }
            }

            adminField("URL do material", text: $materialURL, placeholder: "https://...", keyboard: .URL)
            adminField("Marcadores", text: $materialTags, placeholder: "Ex.: altar, checklist, domingo")

            Toggle(isOn: $isMaterialPublished) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Publicar agora")
                        .font(MESCFont.body.weight(.semibold))
                    Text("O material aparece na biblioteca e avisa os ministros da comunidade.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
            }
            .tint(MESCColor.accent)
            .padding(12)
            .mescGlass(cornerRadius: 16)

            MESCSecondaryButton(
                title: appModel.isSavingFormationContent ? "Publicando..." : "Publicar material",
                symbol: "paperplane"
            ) {
                Task { await submitMaterial() }
            }
            .disabled(appModel.isSavingFormationContent || trimmed(materialTitle).count < 3 || trimmed(materialURL).isEmpty)
            .opacity(appModel.isSavingFormationContent || trimmed(materialTitle).count < 3 || trimmed(materialURL).isEmpty ? 0.55 : 1)
        }
    }

    private func recentLessons(_ studio: MobileFormationAdminStudioDTO) -> some View {
        GlassPanel(spacing: 12) {
            SectionTitle(title: "Aulas recentes", symbol: "clock.arrow.circlepath")
            let lessons = studio.tracks.flatMap { $0.modules }.flatMap { $0.lessons }
                .sorted { ($0.updatedAt ?? "") > ($1.updatedAt ?? "") }

            if lessons.isEmpty {
                EmptyState(title: "Sem aulas cadastradas", detail: "As novas aulas aparecerão aqui após o primeiro salvamento.")
            } else {
                ForEach(lessons) { lesson in
                    FormationAdminLessonListRow(lesson: lesson) {
                        selectedLessonForEditing = lesson
                    }
                }
            }
        }
    }

    private var modules: [MobileFormationAdminModuleDTO] {
        appModel.formationAdminStudio?.tracks.flatMap { $0.modules } ?? []
    }

    private var moduleIds: [String] {
        modules.map(\.id)
    }

    private func selectDefaultModuleIfNeeded() {
        guard selectedModuleId.isEmpty || !moduleIds.contains(selectedModuleId) else { return }
        selectedModuleId = modules.first?.id ?? ""
    }

    private func adminField(
        _ label: String,
        text: Binding<String>,
        placeholder: String,
        keyboard: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
            TextField(placeholder, text: text)
                .font(MESCFont.body)
                .keyboardType(keyboard)
                .textInputAutocapitalization(label.contains("URL") ? .never : .sentences)
                .autocorrectionDisabled(label.contains("URL"))
                .padding(14)
                .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(MESCColor.separator, lineWidth: 1)
                )
        }
    }

    private func submitLesson() async {
        let duration = Int(trimmed(durationText))
        let payload = FormationAdminLessonRequestBody(
            moduleId: selectedModuleId,
            title: trimmed(title),
            description: nilIfEmpty(description),
            lessonNumber: nil,
            durationMinutes: duration,
            isActive: isActive,
            sectionTitle: nilIfEmpty(videoUrl) == nil ? "Conteúdo da aula" : "Vídeo da aula",
            sectionContent: nilIfEmpty(sectionContent),
            videoUrl: nilIfEmpty(videoUrl)
        )

        let didSave = await appModel.createFormationAdminLesson(payload)
        if didSave {
            title = ""
            description = ""
            sectionContent = ""
            videoUrl = ""
            durationText = ""
            isActive = true
        }
    }

    private func submitMaterial() async {
        let tags = materialTags
            .split(separator: ",")
            .map { trimmed(String($0)) }
            .filter { !$0.isEmpty }
        let payload = FormationAdminMaterialRequestBody(
            title: trimmed(materialTitle),
            description: nilIfEmpty(materialDescription),
            type: materialType,
            category: materialCategory,
            trackId: nil,
            externalUrl: trimmed(materialURL),
            tags: tags,
            isPublished: isMaterialPublished
        )

        let didSave = await appModel.createFormationAdminMaterial(payload)
        if didSave {
            materialTitle = ""
            materialDescription = ""
            materialURL = ""
            materialTags = ""
            materialType = "document"
            materialCategory = "pratica"
            isMaterialPublished = true
        }
    }

    private func trimmed(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func nilIfEmpty(_ value: String) -> String? {
        let cleaned = trimmed(value)
        return cleaned.isEmpty ? nil : cleaned
    }
}

struct FormationAdminLessonListRow: View {
    let lesson: MobileFormationAdminLessonDTO
    let onOpen: () -> Void

    private var isEditable: Bool {
        lesson.isEditable ?? true
    }

    var body: some View {
        Button(action: onOpen) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: lesson.videoUrl == nil ? "text.book.closed" : "play.rectangle", tint: lesson.isActive ? MESCColor.accent : MESCColor.textSecondary)
                VStack(alignment: .leading, spacing: 4) {
                    Text(lesson.title)
                        .font(MESCFont.body.weight(.semibold))
                        .foregroundStyle(MESCColor.textPrimary)
                        .lineLimit(2)
                    HStack(spacing: 8) {
                        Text("Aula \(lesson.lessonNumber)")
                        if let duration = lesson.estimatedDuration {
                            Text("\(duration) min")
                        }
                        Text("\(lesson.sectionsCount) seções")
                    }
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    Text(lesson.isActive ? "Publicada" : "Rascunho")
                        .font(MESCFont.caption2.weight(.semibold))
                        .foregroundStyle(lesson.isActive ? MESCColor.accent : MESCColor.textSecondary)
                    if !isEditable {
                        Text("Formação oficial")
                            .font(MESCFont.caption2.weight(.semibold))
                            .foregroundStyle(MESCColor.gold)
                    }
                }
                Spacer()
                Image(systemName: isEditable ? "chevron.right" : "lock.fill")
                    .font(.system(size: 13, weight: .semibold))
                    .foregroundStyle(MESCColor.textSecondary)
            }
            .padding(12)
            .mescGlass(cornerRadius: 16)
        }
        .buttonStyle(.plain)
        .disabled(!isEditable)
        .accessibilityHint(isEditable ? "Edita esta aula ou adiciona conteúdo" : "Conteúdo oficial disponível somente para consulta")
    }
}

struct FormationAdminLessonEditorSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let lesson: MobileFormationAdminLessonDTO
    let onFinished: () -> Void

    @State private var title: String
    @State private var description: String
    @State private var durationText: String
    @State private var isActive: Bool
    @State private var sectionTitle = ""
    @State private var sectionContent = ""
    @State private var sectionVideoUrl = ""

    init(lesson: MobileFormationAdminLessonDTO, onFinished: @escaping () -> Void) {
        self.lesson = lesson
        self.onFinished = onFinished
        _title = State(initialValue: lesson.title)
        _description = State(initialValue: lesson.description ?? "")
        _durationText = State(initialValue: lesson.estimatedDuration.map(String.init) ?? "")
        _isActive = State(initialValue: lesson.isActive)
    }

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: 18) {
                    header
                    lessonDetails
                    contentForm
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 34)
            }
        }
    }

    private var header: some View {
        GlassPanel(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: lesson.videoUrl == nil ? "text.book.closed" : "play.rectangle", tint: MESCColor.gold)
                VStack(alignment: .leading, spacing: 5) {
                    Text("Coordenação")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text("Editar aula")
                        .font(MESCFont.title2)
                    Text("Aula \(lesson.lessonNumber) · \(lesson.sectionsCount) seções")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
                MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar edição") {
                    onFinished()
                    dismiss()
                }
            }
        }
    }

    private var lessonDetails: some View {
        GlassPanel(spacing: 14) {
            SectionTitle(title: "Dados da aula", symbol: "square.and.pencil")
            field("Título", text: $title, placeholder: "Título da aula")
            field("Descrição", text: $description, placeholder: "Resumo para os ministros")
            field("Duração em minutos", text: $durationText, placeholder: "Ex.: 12", keyboard: .numberPad)

            Toggle(isOn: $isActive) {
                VStack(alignment: .leading, spacing: 3) {
                    Text("Publicada")
                        .font(MESCFont.body.weight(.semibold))
                    Text(isActive ? "Visível para os ministros." : "Mantida como rascunho para a coordenação.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
            }
            .tint(MESCColor.accent)
            .padding(12)
            .mescGlass(cornerRadius: 16)

            MESCPrimaryButton(
                title: appModel.isSavingFormationContent ? "Salvando..." : "Salvar alterações",
                symbol: "checkmark.circle"
            ) {
                Task { await saveLesson() }
            }
            .disabled(appModel.isSavingFormationContent || cleaned(title).count < 3)
            .opacity(appModel.isSavingFormationContent || cleaned(title).count < 3 ? 0.55 : 1)
        }
    }

    private var contentForm: some View {
        GlassPanel(spacing: 14) {
            SectionTitle(title: "Adicionar conteúdo", symbol: "plus.rectangle.on.rectangle")
            Text("Inclua uma nova seção de leitura ou vídeo sem substituir o que já foi publicado.")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
            field("Título da seção", text: $sectionTitle, placeholder: "Ex.: Preparação da procissão")

            VStack(alignment: .leading, spacing: 6) {
                Text("Conteúdo da seção")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                TextEditor(text: $sectionContent)
                    .font(MESCFont.body)
                    .frame(minHeight: 120)
                    .padding(10)
                    .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                    .overlay(
                        RoundedRectangle(cornerRadius: 14, style: .continuous)
                            .stroke(MESCColor.separator, lineWidth: 1)
                    )
            }

            field("URL do vídeo", text: $sectionVideoUrl, placeholder: "https://...", keyboard: .URL)

            MESCSecondaryButton(
                title: appModel.isSavingFormationContent ? "Adicionando..." : "Adicionar seção",
                symbol: "plus.circle"
            ) {
                Task { await addSection() }
            }
            .disabled(appModel.isSavingFormationContent || cleaned(sectionTitle).count < 3)
            .opacity(appModel.isSavingFormationContent || cleaned(sectionTitle).count < 3 ? 0.55 : 1)
        }
    }

    private func field(
        _ label: String,
        text: Binding<String>,
        placeholder: String,
        keyboard: UIKeyboardType = .default
    ) -> some View {
        VStack(alignment: .leading, spacing: 6) {
            Text(label)
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
            TextField(placeholder, text: text)
                .font(MESCFont.body)
                .keyboardType(keyboard)
                .textInputAutocapitalization(keyboard == .URL ? .never : .sentences)
                .autocorrectionDisabled(keyboard == .URL)
                .padding(14)
                .background(MESCColor.surface.opacity(0.72), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(MESCColor.separator, lineWidth: 1)
                )
        }
    }

    private func saveLesson() async {
        let saved = await appModel.updateFormationAdminLesson(
            lessonId: lesson.id,
            payload: FormationAdminLessonUpdateRequestBody(
                title: cleaned(title),
                description: nilIfEmpty(description),
                lessonNumber: nil,
                durationMinutes: Int(cleaned(durationText)),
                isActive: isActive
            )
        )
        if saved {
            onFinished()
        }
    }

    private func addSection() async {
        let created = await appModel.createFormationAdminLessonSection(
            lessonId: lesson.id,
            payload: FormationAdminSectionRequestBody(
                title: cleaned(sectionTitle),
                content: nilIfEmpty(sectionContent),
                type: nil,
                videoUrl: nilIfEmpty(sectionVideoUrl),
                audioUrl: nil,
                documentUrl: nil,
                estimatedMinutes: Int(cleaned(durationText)),
                isRequired: true
            )
        )
        if created {
            sectionTitle = ""
            sectionContent = ""
            sectionVideoUrl = ""
            onFinished()
        }
    }

    private func cleaned(_ value: String) -> String {
        value.trimmingCharacters(in: .whitespacesAndNewlines)
    }

    private func nilIfEmpty(_ value: String) -> String? {
        let value = cleaned(value)
        return value.isEmpty ? nil : value
    }
}

struct FormationLessonSectionCard: View {
    let section: MobileFormationLessonSectionDTO
    let isCompleted: Bool
    let isCompleting: Bool
    let isProgressMutationInFlight: Bool
    let isLessonCompleted: Bool
    let quiz: FormationQuizDefinition?
    let quizResult: FormationQuizResult?
    let onComplete: () -> Void
    let onOpenMedia: (FormationMediaTarget) -> Void
    let onOpenQuiz: (FormationQuizDefinition) -> Void

    var body: some View {
        GlassPanel(spacing: 10) {
            HStack(alignment: .top, spacing: 10) {
                SectionTitle(title: section.title, symbol: isCompleted ? "checkmark.seal.fill" : sectionSymbol)
                Spacer(minLength: 8)
                if isCompleted {
                    Label("Concluída", systemImage: "checkmark.circle.fill")
                        .font(MESCFont.caption2.weight(.semibold))
                        .foregroundStyle(MESCColor.accent)
                }
            }

            if let content = section.content, !content.isEmpty {
                Text(content.mescPlainText)
                    .font(MESCFont.body)
                    .foregroundStyle(MESCColor.textPrimary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 10) {
                if let minutes = section.estimatedMinutes {
                    Label("\(minutes) min", systemImage: "clock")
                }
                if let target = FormationMediaTarget(title: section.title, urlString: section.videoUrl) {
                    Button {
                        onOpenMedia(target)
                    } label: {
                        Label("Vídeo", systemImage: "play.rectangle")
                    }
                    .buttonStyle(.plain)
                }
                if let documentUrl = section.documentUrl, let url = URL(string: documentUrl), !documentUrl.isEmpty {
                    Link(destination: url) {
                        Label("Material", systemImage: "doc.text")
                    }
                }
            }
            .font(MESCFont.caption)
            .foregroundStyle(MESCColor.accent)

            if let quiz {
                quizAction(quiz)
            } else if !isCompleted {
                Button(action: onComplete) {
                    Label(isCompleting ? "Concluindo..." : "Marcar seção como concluída", systemImage: isCompleting ? "hourglass" : "checkmark.circle")
                        .font(MESCFont.caption.weight(.semibold))
                        .frame(maxWidth: .infinity)
                        .padding(.vertical, 10)
                        .background(MESCColor.surface.opacity(0.58), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
                }
                .buttonStyle(.plain)
                .foregroundStyle(MESCColor.accent)
                .disabled(isProgressMutationInFlight || isLessonCompleted)
            }
        }
    }

    @ViewBuilder
    private func quizAction(_ quiz: FormationQuizDefinition) -> some View {
        if let quizResult {
            HStack(spacing: 9) {
                Image(systemName: quizResult.passed ? "checkmark.seal.fill" : "arrow.clockwise.circle")
                    .foregroundStyle(quizResult.passed ? MESCColor.accent : MESCColor.gold)
                Text(quizResult.passed ? "Quiz concluído: \(quizResult.score)%" : "Quiz: \(quizResult.score)% - reveja e tente novamente")
                    .font(MESCFont.caption.weight(.semibold))
                    .foregroundStyle(quizResult.passed ? MESCColor.accent : MESCColor.textSecondary)
                Spacer(minLength: 4)
                if !quizResult.passed {
                    Button("Refazer") {
                        onOpenQuiz(quiz)
                    }
                    .font(MESCFont.caption.weight(.semibold))
                    .foregroundStyle(MESCColor.accent)
                    .buttonStyle(.plain)
                }
            }
            .padding(11)
            .background(MESCColor.surface.opacity(0.58), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
        } else {
            Button {
                onOpenQuiz(quiz)
            } label: {
                Label("Iniciar quiz de avaliação", systemImage: "questionmark.circle")
                    .font(MESCFont.caption.weight(.semibold))
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 10)
                    .background(MESCColor.surface.opacity(0.58), in: RoundedRectangle(cornerRadius: 12, style: .continuous))
            }
            .buttonStyle(.plain)
            .foregroundStyle(MESCColor.accent)
            .disabled(isLessonCompleted)
        }
    }

    private var sectionSymbol: String {
        switch section.contentType?.lowercased() {
        case "video":
            return "play.rectangle"
        case "quiz":
            return "questionmark.circle"
        case "audio":
            return "waveform"
        default:
            return "text.book.closed"
        }
    }
}

struct FormationMediaTarget: Identifiable {
    let title: String
    let url: URL

    var id: String { url.absoluteString }

    init?(title: String, urlString: String?) {
        guard let urlString, !urlString.isEmpty, let url = URL(string: urlString) else {
            return nil
        }
        self.title = title
        self.url = url
    }

    var supportsNativePlayback: Bool {
        switch url.pathExtension.lowercased() {
        case "m3u8", "mp4", "m4v", "mov":
            return true
        default:
            return false
        }
    }
}

private struct FormationMediaSheet: View {
    let target: FormationMediaTarget

    var body: some View {
        if target.supportsNativePlayback {
            FormationNativeVideoPlayerSheet(target: target)
        } else {
            FormationBrowserVideoSheet(target: target)
        }
    }
}

private struct FormationNativeVideoPlayerSheet: View {
    @Environment(\.dismiss) private var dismiss
    let target: FormationMediaTarget
    @State private var player: AVPlayer

    init(target: FormationMediaTarget) {
        self.target = target
        _player = State(initialValue: AVPlayer(url: target.url))
    }

    var body: some View {
        ZStack {
            Color.black.ignoresSafeArea()
            VStack(spacing: 0) {
                HStack(spacing: 12) {
                    Text(target.title)
                        .font(MESCFont.body.weight(.semibold))
                        .foregroundStyle(.white)
                        .lineLimit(2)
                    Spacer()
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(.white)
                            .frame(width: 34, height: 34)
                            .background(Color.white.opacity(0.16), in: Circle())
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Fechar vídeo")
                }
                .padding(18)

                VideoPlayer(player: player)
                    .aspectRatio(16 / 9, contentMode: .fit)
                    .frame(maxWidth: .infinity)

                Spacer()
            }
        }
        .onAppear { player.play() }
        .onDisappear { player.pause() }
    }
}

private struct FormationBrowserVideoSheet: View {
    @Environment(\.dismiss) private var dismiss
    let target: FormationMediaTarget

    var body: some View {
        ZStack(alignment: .topTrailing) {
            FormationSafariView(url: target.url)
                .ignoresSafeArea()
            Button {
                dismiss()
            } label: {
                Image(systemName: "xmark")
                    .font(.system(size: 14, weight: .bold))
                    .foregroundStyle(MESCColor.textPrimary)
                    .frame(width: 34, height: 34)
                    .background(.ultraThinMaterial, in: Circle())
            }
            .buttonStyle(.plain)
            .padding(.top, 16)
            .padding(.trailing, 16)
            .accessibilityLabel("Fechar vídeo")
        }
    }
}

private struct FormationSafariView: UIViewControllerRepresentable {
    let url: URL

    func makeUIViewController(context: Context) -> SFSafariViewController {
        SFSafariViewController(url: url)
    }

    func updateUIViewController(_ uiViewController: SFSafariViewController, context: Context) {}
}

struct FormationQuizDefinition: Identifiable {
    let id: String
    let title: String
    let description: String?
    let passingScore: Int
    let questions: [FormationQuizQuestion]

    init?(section: MobileFormationLessonSectionDTO) {
        guard section.contentType?.lowercased() == "quiz",
              let payload = section.quizData?.mescObject,
              let rawQuestions = payload["questions"]?.mescArray else {
            return nil
        }

        let questions = rawQuestions.compactMap(FormationQuizQuestion.init(payload:))
        guard !questions.isEmpty else { return nil }

        id = section.id
        title = payload["title"]?.mescString ?? section.title
        description = payload["description"]?.mescString
        passingScore = min(max(payload["passingScore"]?.mescInt ?? 70, 0), 100)
        self.questions = questions
    }
}

struct FormationQuizQuestion: Identifiable {
    let id: String
    let title: String
    let options: [String]
    let correctAnswerIndex: Int
    let explanation: String?

    init?(payload: JSONValue) {
        guard let object = payload.mescObject,
              let options = object["options"]?.mescArray?.compactMap(\.mescString),
              !options.isEmpty else {
            return nil
        }

        let rawAnswer = object["correctAnswer"] ?? object["correctOptionIndex"]
        let answerIndex: Int?
        if let index = rawAnswer?.mescInt {
            answerIndex = index
        } else if let answer = rawAnswer?.mescString {
            answerIndex = Int(answer) ?? options.firstIndex(of: answer)
        } else {
            answerIndex = nil
        }

        guard let answerIndex, options.indices.contains(answerIndex) else { return nil }

        id = object["id"]?.mescString ?? UUID().uuidString
        title = object["question"]?.mescString ?? object["prompt"]?.mescString ?? object["title"]?.mescString ?? "Pergunta"
        self.options = options
        correctAnswerIndex = answerIndex
        explanation = object["explanation"]?.mescString
    }
}

struct FormationQuizResult: Equatable {
    let score: Int
    let passed: Bool
}

private struct FormationQuizSheet: View {
    @Environment(\.dismiss) private var dismiss
    let quiz: FormationQuizDefinition
    let onFinished: (FormationQuizResult) -> Void
    @State private var currentIndex = 0
    @State private var selectedAnswers: [Int]
    @State private var result: FormationQuizResult?

    init(quiz: FormationQuizDefinition, onFinished: @escaping (FormationQuizResult) -> Void) {
        self.quiz = quiz
        self.onFinished = onFinished
        _selectedAnswers = State(initialValue: Array(repeating: -1, count: quiz.questions.count))
    }

    var body: some View {
        ZStack {
            MESCBackground()

            if let result {
                quizResult(result)
            } else {
                quizQuestion
            }
        }
    }

    private var quizQuestion: some View {
        let question = quiz.questions[currentIndex]
        return ScrollView(showsIndicators: false) {
            LazyVStack(alignment: .leading, spacing: 18) {
                GlassPanel(spacing: 10) {
                    HStack(alignment: .top, spacing: 12) {
                        SymbolTile(symbol: "questionmark.circle", tint: MESCColor.gold)
                        VStack(alignment: .leading, spacing: 5) {
                            Text(quiz.title)
                                .font(MESCFont.title2)
                            if let description = quiz.description, !description.isEmpty {
                                Text(description)
                                    .font(MESCFont.caption)
                                    .foregroundStyle(MESCColor.textSecondary)
                            }
                            Text("Questão \(currentIndex + 1) de \(quiz.questions.count) · mínimo \(quiz.passingScore)%")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.accent)
                        }
                        Spacer()
                        MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar quiz") {
                            dismiss()
                        }
                    }
                    ProgressView(value: Double(currentIndex + 1), total: Double(quiz.questions.count))
                        .tint(MESCColor.gold)
                }

                GlassPanel(spacing: 14) {
                    Text(question.title)
                        .font(MESCFont.cardTitle)
                        .fixedSize(horizontal: false, vertical: true)

                    ForEach(Array(question.options.enumerated()), id: \.offset) { index, option in
                        ChoiceRow(title: option, isSelected: selectedAnswers[currentIndex] == index) {
                            selectedAnswers[currentIndex] = index
                        }
                    }
                }

                HStack(spacing: 10) {
                    MESCSecondaryButton(title: "Anterior", symbol: "chevron.left") {
                        currentIndex = max(currentIndex - 1, 0)
                    }
                    .disabled(currentIndex == 0)
                    .opacity(currentIndex == 0 ? 0.55 : 1)

                    MESCPrimaryButton(
                        title: currentIndex == quiz.questions.count - 1 ? "Finalizar" : "Próxima",
                        symbol: currentIndex == quiz.questions.count - 1 ? "checkmark.circle" : "chevron.right"
                    ) {
                        advance()
                    }
                    .disabled(selectedAnswers[currentIndex] < 0)
                    .opacity(selectedAnswers[currentIndex] < 0 ? 0.55 : 1)
                }
            }
            .padding(.horizontal, 18)
            .padding(.top, 22)
            .padding(.bottom, 34)
        }
    }

    private func quizResult(_ result: FormationQuizResult) -> some View {
        VStack(spacing: 18) {
            Spacer()
            SymbolTile(
                symbol: result.passed ? "checkmark.seal.fill" : "arrow.clockwise.circle.fill",
                tint: result.passed ? MESCColor.accent : MESCColor.gold
            )
            Text(result.passed ? "Quiz concluído" : "Vamos revisar")
                .font(MESCFont.title2)
            Text("Você acertou \(result.score)% das questões.")
                .font(MESCFont.body)
                .foregroundStyle(MESCColor.textSecondary)
            Text(result.passed ? "A avaliação foi concluída. Agora você pode marcar a aula como realizada." : "A nota mínima é \(quiz.passingScore)%. Revise a aula e faça o quiz novamente.")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                .multilineTextAlignment(.center)
                .fixedSize(horizontal: false, vertical: true)

            MESCPrimaryButton(
                title: result.passed ? "Voltar à aula" : "Tentar novamente",
                symbol: result.passed ? "arrow.uturn.left" : "arrow.clockwise"
            ) {
                if result.passed {
                    dismiss()
                } else {
                    currentIndex = 0
                    selectedAnswers = Array(repeating: -1, count: quiz.questions.count)
                    self.result = nil
                }
            }
            .padding(.top, 8)
            Spacer()
        }
        .padding(24)
    }

    private func advance() {
        guard selectedAnswers[currentIndex] >= 0 else { return }
        if currentIndex < quiz.questions.count - 1 {
            currentIndex += 1
            return
        }

        let correctAnswers = zip(quiz.questions, selectedAnswers)
            .filter { question, answer in question.correctAnswerIndex == answer }
            .count
        let score = Int((Double(correctAnswers) / Double(quiz.questions.count) * 100).rounded())
        let nextResult = FormationQuizResult(score: score, passed: score >= quiz.passingScore)
        result = nextResult
        onFinished(nextResult)
    }
}

extension JSONValue {
    var mescObject: [String: JSONValue]? {
        guard case let .object(value) = self else { return nil }
        return value
    }

    var mescArray: [JSONValue]? {
        guard case let .array(value) = self else { return nil }
        return value
    }

    var mescString: String? {
        guard case let .string(value) = self else { return nil }
        return value
    }

    var mescInt: Int? {
        switch self {
        case let .number(value):
            return Int(value)
        case let .string(value):
            return Int(value)
        default:
            return nil
        }
    }
}

struct CoordinatorQuestionnaireManagerSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var selectedMonth = CoordinatorQuestionnaireManagerSheet.defaultReferenceMonth()
    @State private var title = ""
    @State private var description = ""
    @State private var deadline = CoordinatorQuestionnaireManagerSheet.defaultResponseDeadline()
    @State private var showPublishConfirmation = false
    @State private var showCloseConfirmation = false

    private var questionnaire: MobileCoordinatorQuestionnaireSummaryDTO? {
        appModel.coordinatorHome?.questionnaire
    }

    private var isDraft: Bool { questionnaire?.status == "draft" }
    private var isPublished: Bool { questionnaire?.status == "published" }

    var body: some View {
        NavigationView {
            ZStack {
                MESCBackground()

                ScrollView(showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: 16) {
                        GlassPanel(spacing: 12) {
                            SectionTitle(title: "Disponibilidade", symbol: "list.clipboard")
                            Text("Prepare o questionário mensal, publique o convite aos ministros e encerre-o antes da escala definitiva.")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                        }

                        if let questionnaire {
                            questionnaireStatus(questionnaire)
                        } else {
                            creationForm
                        }

                        actionPanel

                        if let message = appModel.coordinatorMessage {
                            Label(message, systemImage: "info.circle")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                                .padding(14)
                                .mescGlass(cornerRadius: 16)
                        }
                    }
                    .padding(.horizontal, 18)
                    .padding(.top, 18)
                    .padding(.bottom, 34)
                }
            }
            .navigationTitle("Questionário")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Concluir") { dismiss() }
                }
            }
            .confirmationDialog("Publicar questionário?", isPresented: $showPublishConfirmation, titleVisibility: .visible) {
                Button("Publicar") {
                    guard let questionnaire else { return }
                    Task { _ = await appModel.publishCoordinatorQuestionnaire(questionnaireId: questionnaire.id) }
                }
            } message: {
                Text("Os ministros da comunidade receberão um aviso para informar a disponibilidade.")
            }
            .confirmationDialog("Encerrar questionário?", isPresented: $showCloseConfirmation, titleVisibility: .visible) {
                Button("Encerrar", role: .destructive) {
                    guard let questionnaire else { return }
                    Task { _ = await appModel.closeCoordinatorQuestionnaire(questionnaireId: questionnaire.id) }
                }
            } message: {
                Text("Após o encerramento, novas respostas não poderão ser enviadas e a escala poderá ser publicada.")
            }
            .onAppear {
                if questionnaire == nil {
                    selectedMonth = Self.defaultReferenceMonth()
                    deadline = Self.defaultResponseDeadline()
                }
            }
        }
        .navigationViewStyle(.stack)
    }

    private var creationForm: some View {
        GlassPanel(spacing: 14) {
            Picker("Mês da disponibilidade", selection: $selectedMonth) {
                ForEach(referenceMonthOptions, id: \.self) { month in
                    Text(Self.referenceMonthLabel(month)).tag(month)
                }
            }
            .pickerStyle(.menu)

            Text("A disponibilidade é organizada por mês, sem data específica.")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)

            VStack(alignment: .leading, spacing: 6) {
                Text("Título opcional")
                    .font(MESCFont.caption.weight(.semibold))
                TextField("Disponibilidade do mês", text: $title)
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 6) {
                Text("Mensagem aos ministros")
                    .font(MESCFont.caption.weight(.semibold))
                TextField("Orientação opcional", text: $description)
                    .textFieldStyle(.roundedBorder)
            }

            VStack(alignment: .leading, spacing: 4) {
                Text("Prazo para responder")
                    .font(MESCFont.caption.weight(.semibold))
                Text(Self.deadlineLabel(deadline))
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.accent)
                Text("Calculado para cinco dias úteis antes do fim do mês atual.")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }
        }
    }

    private var referenceMonthOptions: [Date] {
        let calendar = Self.operatingCalendar
        return (0..<12).compactMap { offset in
            calendar.date(byAdding: .month, value: offset, to: Self.defaultReferenceMonth())
        }
    }

    private static var operatingCalendar: Calendar {
        var calendar = Calendar(identifier: .gregorian)
        calendar.timeZone = TimeZone(identifier: "America/Sao_Paulo") ?? .current
        return calendar
    }

    private static func defaultReferenceMonth(from now: Date = Date()) -> Date {
        let calendar = operatingCalendar
        let components = calendar.dateComponents([.year, .month], from: now)
        guard let currentMonth = calendar.date(from: components) else { return now }
        return calendar.date(byAdding: .month, value: 1, to: currentMonth) ?? currentMonth
    }

    private static func defaultResponseDeadline(from now: Date = Date()) -> Date {
        let calendar = operatingCalendar
        let components = calendar.dateComponents([.year, .month], from: now)
        guard let startOfMonth = calendar.date(from: components),
              var cursor = calendar.date(byAdding: DateComponents(month: 1, day: -1), to: startOfMonth)
        else { return now }

        var businessDays = 0
        while businessDays < 5 {
            guard let previousDay = calendar.date(byAdding: .day, value: -1, to: cursor) else { break }
            cursor = previousDay
            let weekday = calendar.component(.weekday, from: cursor)
            if weekday != 1 && weekday != 7 {
                businessDays += 1
            }
        }

        return calendar.date(bySettingHour: 23, minute: 59, second: 59, of: cursor) ?? cursor
    }

    private static func referenceMonthLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = operatingCalendar
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "MMMM yyyy"
        return formatter.string(from: date).capitalized
    }

    private static func deadlineLabel(_ date: Date) -> String {
        let formatter = DateFormatter()
        formatter.calendar = operatingCalendar
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateStyle = .long
        return formatter.string(from: date)
    }

    private func questionnaireStatus(_ questionnaire: MobileCoordinatorQuestionnaireSummaryDTO) -> some View {
        GlassPanel(spacing: 12) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(
                    symbol: questionnaire.status == "closed" ? "checkmark.seal.fill" : questionnaire.status == "published" ? "paperplane.fill" : "doc.text.fill",
                    tint: questionnaire.status == "published" ? MESCColor.accent : MESCColor.gold
                )
                VStack(alignment: .leading, spacing: 4) {
                    Text(questionnaire.title)
                        .font(MESCFont.cardTitle)
                    Text(MESCNativeAppModel.monthLabel(from: String(format: "%04d-%02d", questionnaire.year, questionnaire.month)))
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                    Text(questionnaire.status == "draft" ? "Rascunho pronto para revisão" : questionnaire.status == "published" ? "Aguardando respostas dos ministros" : "Encerrado para elaboração da escala")
                        .font(MESCFont.caption.weight(.semibold))
                        .foregroundStyle(questionnaire.status == "published" ? MESCColor.accent : MESCColor.gold)
                }
                Spacer(minLength: 0)
            }

            HStack(spacing: 10) {
                StatusPill(title: "\(questionnaire.responses)/\(questionnaire.target)", symbol: "person.2", tint: MESCColor.accent)
                StatusPill(title: "\(questionnaire.responseRate)%", symbol: "chart.bar", tint: MESCColor.gold)
            }
        }
    }

    private var actionPanel: some View {
        GlassPanel(spacing: 12) {
            if appModel.isMutatingCoordinatorQuestionnaire {
                HStack(spacing: 10) {
                    ProgressView().tint(MESCColor.accent)
                    Text("Salvando questionário...")
                        .font(MESCFont.body.weight(.semibold))
                }
            } else if questionnaire == nil {
                MESCPrimaryButton(title: "Criar rascunho", symbol: "plus.circle.fill") {
                    Task {
                        _ = await appModel.createCoordinatorQuestionnaire(
                            month: selectedMonth,
                            title: title,
                            description: description,
                            deadline: deadline
                        )
                    }
                }
            } else if isDraft {
                MESCPrimaryButton(title: "Publicar para ministros", symbol: "paperplane.fill") {
                    showPublishConfirmation = true
                }
            } else if isPublished {
                MESCPrimaryButton(title: "Encerrar questionário", symbol: "checkmark.seal.fill") {
                    showCloseConfirmation = true
                }
            } else {
                Label("Questionário encerrado e pronto para a escala", systemImage: "checkmark.circle.fill")
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.accent)
                    .frame(maxWidth: .infinity, alignment: .leading)
            }
        }
    }

}

struct CoordinatorScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var replaceExisting = false
    @State private var showPublishConfirmation = false
    @State private var isQuestionnaireManagerPresented = false

    var body: some View {
        MESCScrollScreen(
            title: "Coordenação",
            subtitle: appModel.activeCommunity?.name ?? "Comunidade"
        ) {
            if appModel.isLoadingCoordinator && appModel.coordinatorHome == nil {
                ProgressView("Carregando a comunidade...")
                    .tint(MESCColor.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 42)
            }

            if let home = appModel.coordinatorHome {
                communitySummary(home)
                questionnairePanel(home)
                readinessPanel
                coveragePanel(home)
                substitutionsPanel(home)
                ministersPanel
            } else if !appModel.isLoadingCoordinator {
                EmptyState(
                    title: "Painel indisponível",
                    detail: "Atualize para consultar as pendências e a cobertura da comunidade."
                )
            }

            if let message = appModel.coordinatorMessage {
                Label(message, systemImage: "info.circle")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
                    .padding(14)
                    .mescGlass(cornerRadius: 16)
            }
        }
        .task {
            await appModel.refreshCoordinator()
        }
        .alert("Publicar escala?", isPresented: $showPublishConfirmation) {
            Button("Cancelar", role: .cancel) {}
            Button("Publicar", role: .destructive) {
                Task {
                    _ = await appModel.publishCoordinatorSchedule(replaceExisting: replaceExisting)
                }
            }
        } message: {
            Text(replaceExisting
                ? "A escala existente deste mês será substituída. A ação será registrada e os ministros receberão um aviso."
                : "A escala será publicada para os ministros da comunidade e a ação será registrada.")
        }
        .sheet(isPresented: $isQuestionnaireManagerPresented) {
            CoordinatorQuestionnaireManagerSheet()
                .environmentObject(appModel)
        }
    }

    private func communitySummary(_ home: MobileCoordinatorCommunityHomeDTO) -> some View {
        GlassPanel(spacing: 16) {
            HStack(alignment: .top, spacing: 12) {
                SymbolTile(symbol: "person.3.fill", tint: MESCColor.accent)
                VStack(alignment: .leading, spacing: 4) {
                    Text(home.community.name)
                        .font(MESCFont.cardTitle)
                    Text("Visão de \(MESCNativeAppModel.monthLabel(from: home.month))")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
                MESCIconButton(symbol: "arrow.clockwise", accessibilityLabel: "Atualizar painel", isDisabled: appModel.isLoadingCoordinator) {
                    Task { await appModel.refreshCoordinator() }
                }
            }

            LazyVGrid(
                columns: [GridItem(.flexible(), spacing: 10), GridItem(.flexible(), spacing: 10)],
                spacing: 10
            ) {
                CoordinatorMetricTile(title: "Ministros", value: home.metrics.activeMinisters, symbol: "person.2", tint: MESCColor.accent)
                CoordinatorMetricTile(title: "Escalações", value: home.metrics.publishedAssignments, symbol: "calendar", tint: MESCColor.gold)
                CoordinatorMetricTile(title: "Trocas", value: home.metrics.pendingSubstitutions, symbol: "arrow.triangle.2.circlepath", tint: home.metrics.pendingSubstitutions > 0 ? MESCColor.primaryWine : MESCColor.textSecondary)
                CoordinatorMetricTile(title: "Cadastros", value: home.metrics.profileBlocked + home.metrics.profileNeedsAttention, symbol: "person.text.rectangle", tint: home.metrics.profileBlocked > 0 ? MESCColor.primaryWine : MESCColor.gold)
            }
        }
    }

    private func questionnairePanel(_ home: MobileCoordinatorCommunityHomeDTO) -> some View {
        GlassPanel(spacing: 13) {
            HStack {
                SectionTitle(title: "Questionário", symbol: "list.clipboard")
                Spacer()
                Button {
                    isQuestionnaireManagerPresented = true
                } label: {
                    Image(systemName: "slider.horizontal.3")
                        .font(.system(size: 15, weight: .semibold))
                        .foregroundStyle(MESCColor.accent)
                        .frame(width: 34, height: 34)
                        .mescGlass(cornerRadius: 11)
                }
                .buttonStyle(.plain)
                .accessibilityLabel("Gerenciar questionário")
            }

            if let questionnaire = home.questionnaire {
                HStack(alignment: .firstTextBaseline) {
                    VStack(alignment: .leading, spacing: 4) {
                        Text(questionnaire.title)
                            .font(MESCFont.body.weight(.semibold))
                        Text(questionnaire.status == "draft" ? "Rascunho" : questionnaire.status == "closed" ? "Encerrado" : "Publicado")
                            .font(MESCFont.caption.weight(.semibold))
                            .foregroundStyle(questionnaire.status == "published" ? MESCColor.accent : MESCColor.gold)
                        Text("\(questionnaire.responses) de \(questionnaire.target) respostas, \(questionnaire.responseRate)% concluído")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()
                    Text("\(questionnaire.pending) pend.")
                        .font(MESCFont.caption.weight(.semibold))
                        .foregroundStyle(questionnaire.pending > 0 ? MESCColor.primaryWine : MESCColor.accent)
                }

                ProgressView(value: Double(questionnaire.responseRate), total: 100)
                    .tint(questionnaire.pending > 0 ? MESCColor.gold : MESCColor.accent)

                MESCSecondaryButton(
                    title: appModel.isLoadingCoordinatorQuestionnaire ? "Carregando..." : "Ver respostas",
                    symbol: "person.2"
                ) {
                    Task { await appModel.loadCoordinatorQuestionnaireResponses() }
                }
                .disabled(appModel.isLoadingCoordinatorQuestionnaire)

                if let responses = appModel.coordinatorQuestionnaireResponses {
                    VStack(spacing: 8) {
                        ForEach(responses.ministers) { minister in
                            CoordinatorQuestionnaireResponseRow(minister: minister)
                        }
                    }
                }
            } else {
                EmptyState(title: "Sem questionário neste mês", detail: "Use os controles do cabeçalho para preparar a disponibilidade da comunidade.")
                MESCSecondaryButton(title: "Criar questionário", symbol: "plus.circle") {
                    isQuestionnaireManagerPresented = true
                }
            }
        }
    }

    private var readinessPanel: some View {
        GlassPanel(spacing: 13) {
            SectionTitle(title: "Escala do mês", symbol: "calendar.badge.clock")

            if let readiness = appModel.coordinatorReadiness {
                HStack(spacing: 10) {
                    StatusPill(title: "\(readiness.massConfig.configuredSlots) horários", symbol: "clock", tint: MESCColor.accent)
                    StatusPill(title: "\(readiness.existingSchedules.total) registros", symbol: "list.bullet", tint: MESCColor.gold)
                }

                readinessMessages(readiness)

                if readiness.existingSchedules.total > 0 {
                    Toggle("Substituir escala já existente", isOn: $replaceExisting)
                        .font(MESCFont.caption)
                        .tint(MESCColor.primaryWine)
                }

                HStack(spacing: 10) {
                    MESCSecondaryButton(
                        title: appModel.isGeneratingCoordinatorPreview ? "Gerando..." : "Gerar prévia",
                        symbol: "wand.and.stars"
                    ) {
                        Task { await appModel.generateCoordinatorSchedulePreview() }
                    }
                    .disabled(!readiness.readiness.canPreview || appModel.isGeneratingCoordinatorPreview)

                    MESCPrimaryButton(
                        title: appModel.isPublishingCoordinatorSchedule ? "Publicando..." : "Publicar",
                        symbol: "paperplane.fill"
                    ) {
                        showPublishConfirmation = true
                    }
                    .disabled(!readiness.readiness.canPublish || appModel.isPublishingCoordinatorSchedule)
                }

                if let preview = appModel.coordinatorSchedulePreview {
                    Divider().overlay(MESCColor.separator)
                    HStack {
                        Text("Prévia: \(preview.summary.totalAssignments) escalações")
                            .font(MESCFont.caption.weight(.semibold))
                        Spacer()
                        Text("\(preview.summary.totalVacancies) vagas")
                            .font(MESCFont.caption)
                            .foregroundStyle(preview.summary.totalVacancies > 0 ? MESCColor.primaryWine : MESCColor.accent)
                    }
                    ForEach(Array(preview.schedules.prefix(6))) { item in
                        CoordinatorSchedulePreviewRow(item: item)
                    }
                }
            } else {
                ProgressView().tint(MESCColor.accent)
            }
        }
    }

    private func readinessMessages(_ readiness: MobileCoordinatorScheduleReadinessDTO) -> some View {
        VStack(alignment: .leading, spacing: 7) {
            ForEach(readiness.readiness.blockers, id: \.self) { item in
                Label(item, systemImage: "xmark.octagon.fill")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
            }
            ForEach(readiness.readiness.publishBlockers, id: \.self) { item in
                Label(item, systemImage: "exclamationmark.triangle.fill")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.gold)
                    .fixedSize(horizontal: false, vertical: true)
            }
            ForEach(readiness.readiness.warnings, id: \.self) { item in
                Label(item, systemImage: "info.circle")
                    .font(MESCFont.caption2)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
    }

    private func coveragePanel(_ home: MobileCoordinatorCommunityHomeDTO) -> some View {
        GlassPanel(spacing: 12) {
            SectionTitle(title: "Cobertura", symbol: "checklist")
            if home.coverage.isEmpty {
                EmptyState(title: "Sem escala publicada", detail: "A cobertura aparecerá após a publicação da escala.")
            } else {
                ForEach(Array(home.coverage.prefix(8))) { coverage in
                    CoordinatorCoverageRow(coverage: coverage)
                }
            }
        }
    }

    private func substitutionsPanel(_ home: MobileCoordinatorCommunityHomeDTO) -> some View {
        GlassPanel(spacing: 12) {
            SectionTitle(title: "Substituições", symbol: "arrow.triangle.2.circlepath")
            if home.substitutions.isEmpty {
                Text("Nenhuma troca pendente nesta comunidade.")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            } else {
                ForEach(home.substitutions) { substitution in
                    VStack(alignment: .leading, spacing: 4) {
                        Text(MESCNativeAppModel.scheduleDateTitle(date: substitution.schedule.date))
                            .font(MESCFont.body.weight(.semibold))
                        Text("\(MESCNativeAppModel.timeLabel(substitution.schedule.time)) • \(substitution.requester?.name ?? "Ministro")")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .padding(12)
                    .mescGlass(cornerRadius: 16)
                }
            }
        }
    }

    private var ministersPanel: some View {
        GlassPanel(spacing: 12) {
            SectionTitle(title: "Diretório", symbol: "person.text.rectangle")
            if appModel.coordinatorMinisters.isEmpty {
                Text("Nenhum ministro ativo encontrado para esta comunidade.")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            } else {
                ForEach(Array(appModel.coordinatorMinisters.prefix(10))) { minister in
                    CoordinatorMinisterRow(minister: minister)
                }
            }
        }
    }
}

struct CoordinatorMetricTile: View {
    let title: String
    let value: Int
    let symbol: String
    let tint: Color

    var body: some View {
        VStack(alignment: .leading, spacing: 7) {
            Image(systemName: symbol)
                .foregroundStyle(tint)
            Text("\(value)")
                .font(.system(size: 23, weight: .bold, design: .rounded))
                .foregroundStyle(MESCColor.textPrimary)
            Text(title)
                .font(MESCFont.caption2)
                .foregroundStyle(MESCColor.textSecondary)
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(13)
        .mescGlass(cornerRadius: 16)
    }
}

struct CoordinatorQuestionnaireResponseRow: View {
    let minister: MobileCoordinatorQuestionnaireTargetDTO

    var body: some View {
        HStack(spacing: 10) {
            Image(systemName: minister.responded ? "checkmark.circle.fill" : "clock")
                .foregroundStyle(minister.responded ? MESCColor.accent : MESCColor.gold)
            VStack(alignment: .leading, spacing: 3) {
                Text(minister.displayName)
                    .font(MESCFont.caption.weight(.semibold))
                Text(minister.responded ? (minister.availability ?? "Resposta recebida") : "Aguardando resposta")
                    .font(MESCFont.caption2)
                    .foregroundStyle(MESCColor.textSecondary)
            }
            Spacer()
            Text(readinessText)
                .font(MESCFont.caption2.weight(.semibold))
                .foregroundStyle(readinessTint)
        }
        .padding(11)
        .mescGlass(cornerRadius: 14)
    }

    private var readinessText: String {
        switch minister.dataQuality.status {
        case "ready": return "Pronto"
        case "blocked": return "Bloqueado"
        default: return "Revisar"
        }
    }

    private var readinessTint: Color {
        switch minister.dataQuality.status {
        case "ready": return MESCColor.accent
        case "blocked": return MESCColor.primaryWine
        default: return MESCColor.gold
        }
    }
}

struct CoordinatorCoverageRow: View {
    let coverage: MobileCoordinatorCoverageDTO

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            SymbolTile(symbol: coverage.vacancies > 0 ? "exclamationmark.triangle" : "checkmark.seal", tint: coverage.vacancies > 0 ? MESCColor.primaryWine : MESCColor.accent)
            VStack(alignment: .leading, spacing: 3) {
                Text("\(MESCNativeAppModel.scheduleDateTitle(date: coverage.date)) • \(MESCNativeAppModel.timeLabel(coverage.time))")
                    .font(MESCFont.caption.weight(.semibold))
                Text(coverage.location ?? coverage.type.capitalized)
                    .font(MESCFont.caption2)
                    .foregroundStyle(MESCColor.textSecondary)
            }
            Spacer()
            Text(coverage.vacancies > 0 ? "\(coverage.vacancies) vaga(s)" : "\(coverage.assigned) escalado(s)")
                .font(MESCFont.caption2.weight(.semibold))
                .foregroundStyle(coverage.vacancies > 0 ? MESCColor.primaryWine : MESCColor.accent)
        }
        .padding(11)
        .mescGlass(cornerRadius: 16)
    }
}

struct CoordinatorSchedulePreviewRow: View {
    let item: MobileCoordinatorSchedulePreviewItemDTO

    var body: some View {
        HStack(alignment: .top, spacing: 10) {
            Text(MESCNativeAppModel.timeLabel(item.time))
                .font(MESCFont.caption.weight(.bold))
                .foregroundStyle(MESCColor.accent)
                .frame(width: 45, alignment: .leading)
            VStack(alignment: .leading, spacing: 3) {
                Text(item.displayName)
                    .font(MESCFont.caption.weight(.semibold))
                Text(item.date.map(MESCNativeAppModel.scheduleDateTitle(date:)) ?? "Data a confirmar")
                    .font(MESCFont.caption2)
                    .foregroundStyle(MESCColor.textSecondary)
            }
            Spacer()
            Text(item.vacancies > 0 ? "\(item.vacancies) vaga(s)" : "Coberta")
                .font(MESCFont.caption2.weight(.semibold))
                .foregroundStyle(item.vacancies > 0 ? MESCColor.primaryWine : MESCColor.accent)
        }
        .padding(11)
        .mescGlass(cornerRadius: 14)
    }
}

struct CoordinatorMinisterRow: View {
    let minister: MobileCoordinatorMinisterDTO

    var body: some View {
        HStack(spacing: 10) {
            SymbolTile(symbol: "person.fill", tint: readinessTint)
            VStack(alignment: .leading, spacing: 3) {
                Text(minister.displayName)
                    .font(MESCFont.caption.weight(.semibold))
                Text(minister.preferredTimes.isEmpty ? "Sem horários preferenciais" : minister.preferredTimes.joined(separator: " • "))
                    .font(MESCFont.caption2)
                    .foregroundStyle(MESCColor.textSecondary)
                    .lineLimit(1)
            }
            Spacer()
            Text(readinessText)
                .font(MESCFont.caption2.weight(.semibold))
                .foregroundStyle(readinessTint)
        }
        .padding(11)
        .mescGlass(cornerRadius: 14)
    }

    private var readinessText: String {
        switch minister.dataQuality.status {
        case "ready": return "Pronto"
        case "blocked": return "Bloqueado"
        default: return "Revisar"
        }
    }

    private var readinessTint: Color {
        switch minister.dataQuality.status {
        case "ready": return MESCColor.accent
        case "blocked": return MESCColor.primaryWine
        default: return MESCColor.gold
        }
    }
}

struct ProfileScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @State private var isProfileEditorPresented = false
    @State private var photoSource: ProfilePhotoSource?
    @State private var isRemovePhotoConfirmationPresented = false

    var body: some View {
        let name = appModel.user?.name ?? "Ministro"
        let email = appModel.user?.email ?? "E-mail não carregado"
        let initials = name
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
            .map(String.init)
            .joined()
            .uppercased()

        MESCScrollScreen(title: "Perfil", subtitle: "Dados do ministro") {
            GlassPanel(spacing: 16) {
                HStack(spacing: 14) {
                    ProfileAvatar(image: appModel.profileImage, initials: initials, size: 68)

                    VStack(alignment: .leading, spacing: 4) {
                        Text(name)
                            .font(MESCFont.cardTitle)
                        Text("\(appModel.user?.role.capitalized ?? "Ministro") - \(appModel.activeCommunity?.name ?? "Comunidade")")
                            .font(MESCFont.body)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                    Spacer()

                    Menu {
                        Button("Tirar foto", systemImage: "camera") {
                            photoSource = .camera
                        }
                        .disabled(!UIImagePickerController.isSourceTypeAvailable(.camera))

                        Button("Escolher da biblioteca", systemImage: "photo.on.rectangle") {
                            photoSource = .library
                        }

                        if appModel.profileImage != nil || appModel.profile?.photoUrl != nil {
                            Button("Remover foto", systemImage: "trash", role: .destructive) {
                                isRemovePhotoConfirmationPresented = true
                            }
                        }
                    } label: {
                        Image(systemName: appModel.isUpdatingProfilePhoto ? "hourglass" : "camera.fill")
                            .font(.system(size: 17, weight: .semibold))
                            .frame(width: 38, height: 38)
                            .background(.thinMaterial, in: Circle())
                    }
                    .disabled(appModel.isUpdatingProfilePhoto)
                }

                ProfileInfoRow(title: "Email", value: email)
                ProfileInfoRow(title: "Celular", value: appModel.profile?.phone ?? "Não informado")
                ProfileInfoRow(title: "WhatsApp", value: appModel.profile?.whatsapp ?? "Não informado")
                ProfileInfoRow(title: "Comunidade", value: appModel.activeCommunity?.name ?? "Não carregada")
                ProfileInfoRow(title: "Paróquia", value: appModel.activeCommunity?.parishName ?? "São Judas Tadeu")

                MESCSecondaryButton(title: "Editar dados", symbol: "square.and.pencil") {
                    isProfileEditorPresented = true
                }
            }

            GlassPanel(spacing: 14) {
                SectionTitle(title: "Resumo do mês", symbol: "chart.bar")
                ProfileInfoRow(
                    title: "Escalas publicadas",
                    value: "\(appModel.missionHome?.monthlySummary.publishedAssignments ?? 0)"
                )
                ProfileInfoRow(
                    title: "Mês ativo",
                    value: appModel.currentMonthLabel
                )
                ProfileInfoRow(
                    title: "Notificações",
                    value: appModel.pushStatusText
                )
            }

            if let message = appModel.profileMessage {
                Label(message, systemImage: message.contains("atualizada") || message.contains("atualizados") || message.contains("removida") ? "checkmark.seal" : "info.circle")
                    .font(MESCFont.caption)
                    .foregroundStyle(message.contains("atualizada") || message.contains("atualizados") || message.contains("removida") ? MESCColor.accent : MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
            }
        }
        .sheet(isPresented: $isProfileEditorPresented) {
            ProfileEditorSheet(profile: appModel.profile)
                .environmentObject(appModel)
        }
        .sheet(item: $photoSource) { source in
            NativeProfileImagePicker(sourceType: source.sourceType) { image in
                Task { await appModel.uploadProfilePhoto(image) }
            }
            .ignoresSafeArea()
        }
        .confirmationDialog(
            "Remover foto de perfil?",
            isPresented: $isRemovePhotoConfirmationPresented,
            titleVisibility: .visible
        ) {
            Button("Remover foto", role: .destructive) {
                Task { await appModel.removeProfilePhoto() }
            }
        } message: {
            Text("A foto será removida deste cadastro e substituída pelas iniciais do nome.")
        }
    }
}

private enum ProfilePhotoSource: String, Identifiable {
    case camera
    case library

    var id: String { rawValue }

    var sourceType: UIImagePickerController.SourceType {
        switch self {
        case .camera:
            return .camera
        case .library:
            return .photoLibrary
        }
    }
}

private struct ProfileAvatar: View {
    let image: UIImage?
    let initials: String
    let size: CGFloat

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Circle()
                    .fill(
                        LinearGradient(
                            colors: [MESCColor.primaryWine, MESCColor.primaryRed],
                            startPoint: .topLeading,
                            endPoint: .bottomTrailing
                        )
                    )
                    .overlay(
                        Text(initials.isEmpty ? "M" : initials)
                            .font(.system(size: size * 0.33, weight: .bold))
                            .foregroundStyle(.white)
                    )
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(MESCColor.gold.opacity(0.45), lineWidth: 1))
    }
}

private struct ProfileEditorSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var name: String
    @State private var phone: String
    @State private var whatsapp: String
    @State private var scheduleDisplayName: String
    @State private var ministryStartDate: Date?
    @State private var maritalStatus: String

    init(profile: MobileProfileDTO?) {
        _name = State(initialValue: profile?.name ?? "")
        _phone = State(initialValue: profile?.phone ?? "")
        _whatsapp = State(initialValue: profile?.whatsapp ?? "")
        _scheduleDisplayName = State(initialValue: profile?.scheduleDisplayName ?? "")
        _ministryStartDate = State(initialValue: Self.parseDate(profile?.ministryStartDate))
        _maritalStatus = State(initialValue: profile?.maritalStatus ?? "")
    }

    var body: some View {
        NavigationView {
            Form {
                Section("Identificação") {
                    TextField("Nome completo", text: $name)
                        .textContentType(.name)
                        .textInputAutocapitalization(.words)
                    TextField("Nome na escala", text: $scheduleDisplayName)
                        .textInputAutocapitalization(.words)
                }

                Section("Contato") {
                    TextField("Celular", text: $phone)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                    TextField("WhatsApp", text: $whatsapp)
                        .keyboardType(.phonePad)
                        .textContentType(.telephoneNumber)
                }

                Section("Ministério") {
                    DatePicker(
                        "Início no ministério",
                        selection: Binding(
                            get: { ministryStartDate ?? Date() },
                            set: { ministryStartDate = $0 }
                        ),
                        displayedComponents: .date
                    )
                    Picker("Estado civil", selection: $maritalStatus) {
                        Text("Não informado").tag("")
                        Text("Solteiro(a)").tag("Solteiro(a)")
                        Text("Casado(a)").tag("Casado(a)")
                        Text("Viúvo(a)").tag("Viúvo(a)")
                        Text("Divorciado(a)").tag("Divorciado(a)")
                    }
                }

                if let email = appModel.profile?.email ?? appModel.user?.email {
                    Section("Conta") {
                        HStack {
                            Text("E-mail")
                            Spacer()
                            Text(email)
                                .foregroundStyle(.secondary)
                                .multilineTextAlignment(.trailing)
                        }
                    }
                }
            }
            .navigationTitle("Editar perfil")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .cancellationAction) {
                    Button("Cancelar") { dismiss() }
                        .disabled(appModel.isSavingProfile)
                }
                ToolbarItem(placement: .confirmationAction) {
                    Button(appModel.isSavingProfile ? "Salvando..." : "Salvar") {
                        Task {
                            let saved = await appModel.saveProfile(
                                name: name,
                                phone: phone,
                                whatsapp: whatsapp,
                                scheduleDisplayName: scheduleDisplayName,
                                ministryStartDate: ministryStartDate,
                                maritalStatus: maritalStatus
                            )
                            if saved { dismiss() }
                        }
                    }
                    .disabled(appModel.isSavingProfile || name.trimmingCharacters(in: .whitespacesAndNewlines).count < 3)
                }
            }
        }
    }

    private static func parseDate(_ value: String?) -> Date? {
        guard let value, !value.isEmpty else { return nil }
        let formatter = DateFormatter()
        formatter.calendar = Calendar(identifier: .gregorian)
        formatter.locale = Locale(identifier: "en_US_POSIX")
        formatter.timeZone = TimeZone(secondsFromGMT: 0)
        formatter.dateFormat = "yyyy-MM-dd"
        return formatter.date(from: value)
    }
}

private struct NativeProfileImagePicker: UIViewControllerRepresentable {
    let sourceType: UIImagePickerController.SourceType
    let onImagePicked: (UIImage) -> Void
    @Environment(\.dismiss) private var dismiss

    func makeCoordinator() -> Coordinator {
        Coordinator(parent: self)
    }

    func makeUIViewController(context: Context) -> UIImagePickerController {
        let picker = UIImagePickerController()
        picker.sourceType = sourceType
        picker.allowsEditing = true
        picker.delegate = context.coordinator
        return picker
    }

    func updateUIViewController(_ uiViewController: UIImagePickerController, context: Context) {}

    final class Coordinator: NSObject, UINavigationControllerDelegate, UIImagePickerControllerDelegate {
        private let parent: NativeProfileImagePicker

        init(parent: NativeProfileImagePicker) {
            self.parent = parent
        }

        func imagePickerController(
            _ picker: UIImagePickerController,
            didFinishPickingMediaWithInfo info: [UIImagePickerController.InfoKey: Any]
        ) {
            let image = (info[.editedImage] ?? info[.originalImage]) as? UIImage
            parent.dismiss()
            if let image {
                parent.onImagePicked(image)
            }
        }

        func imagePickerControllerDidCancel(_ picker: UIImagePickerController) {
            parent.dismiss()
        }
    }
}

struct SettingsScreen: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel

    var body: some View {
        MESCScrollScreen(title: "Ajustes", subtitle: "Permissões e preferências") {
            GlassPanel(spacing: 16) {
                SectionTitle(title: "Central do aparelho", symbol: "iphone")
                NativePermissionRow(
                    title: "Notificações push",
                    detail: appModel.pushPermissionDetail,
                    status: appModel.pushStatusText,
                    symbol: "bell",
                    isEnabled: appModel.pushLinkedToServer,
                    actionTitle: appModel.pushActionTitle
                ) {
                    Task { await appModel.requestPushNotifications() }
                }
                Label(appModel.pushConnectionText, systemImage: appModel.pushLinkedToServer ? "checkmark.icloud" : "iphone.badge.exclamationmark")
                    .font(MESCFont.caption)
                    .foregroundStyle(appModel.pushLinkedToServer ? MESCColor.gold : MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                if let message = appModel.pushPermissionMessage {
                    Label(message, systemImage: "info.circle")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                SettingsToggleRow(
                    title: appModel.biometricTypeLabel,
                    detail: appModel.biometricAvailable ? "Permitir desbloqueio biométrico depois do login." : "Biometria não disponível neste aparelho.",
                    symbol: "faceid",
                    isOn: biometricBinding
                )
                .disabled(!appModel.biometricAvailable || appModel.isUpdatingSettings)

                NativePermissionRow(
                    title: "Camera e fotos",
                    detail: "Será solicitada no momento de foto de perfil, aula ou anexo.",
                    status: "Sob demanda",
                    symbol: "camera",
                    isEnabled: false,
                    actionTitle: "Ajustes"
                ) {
                    appModel.openSystemSettings()
                }
                NativePermissionRow(
                    title: "Localização",
                    detail: "Somente para fluxos pastorais aprovados no PRD.",
                    status: "Sob demanda",
                    symbol: "location",
                    isEnabled: false,
                    actionTitle: "Ajustes"
                ) {
                    appModel.openSystemSettings()
                }
            }

            GlassPanel(spacing: 16) {
                SectionTitle(title: "Preferências por tipo", symbol: "slider.horizontal.3")
                ForEach(Array(MESCNotificationPreference.options.enumerated()), id: \.element.id) { index, option in
                    SettingsToggleRow(
                        title: option.title,
                        detail: option.detail,
                        symbol: option.symbol,
                        isOn: notificationBinding(option.key)
                    )
                    .disabled(appModel.isUpdatingSettings)

                    if index < MESCNotificationPreference.options.count - 1 {
                        Divider()
                            .opacity(0.55)
                    }
                }
            }

            if let message = appModel.settingsMessage {
                Label(message, systemImage: message.contains("atualizadas") || message.contains("registrado") ? "checkmark.seal" : "info.circle")
                    .font(MESCFont.caption)
                    .foregroundStyle(message.contains("atualizadas") || message.contains("registrado") ? MESCColor.accent : MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
            }

            HStack(spacing: 12) {
                MESCSecondaryButton(title: "Atualizar", symbol: "arrow.clockwise") {
                    Task { await appModel.reload() }
                }
                MESCSecondaryButton(title: "Sair", symbol: "rectangle.portrait.and.arrow.right") {
                    appModel.signOut()
                }
            }
        }
        .task {
            await appModel.refreshNativeNotificationState()
        }
    }

    private var biometricBinding: Binding<Bool> {
        Binding(
            get: { appModel.biometricEnabled },
            set: { enabled in
                Task { await appModel.setBiometricPreference(enabled) }
            }
        )
    }

    private func notificationBinding(_ key: String) -> Binding<Bool> {
        Binding(
            get: { appModel.notificationPreferences[key] ?? true },
            set: { enabled in
                Task { await appModel.setNotificationPreference(key: key, enabled: enabled) }
            }
        )
    }
}

struct MESCScrollScreen<Content: View>: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content
    @State private var isCommunityIdentityPresented = false

    var body: some View {
        NavigationView {
            ZStack {
                MESCBackground()

                ScrollView(showsIndicators: false) {
                    LazyVStack(alignment: .leading, spacing: 18) {
                        Text(subtitle)
                            .font(MESCFont.subheadline.weight(.semibold))
                            .foregroundStyle(MESCColor.accent)
                            .padding(.top, 8)

                        content
                    }
                    .padding(.horizontal, 18)
                    .padding(.bottom, 28)
                }
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    MESCNotificationBell(unreadCount: appModel.unreadNotificationsCount) {
                        appModel.isNotificationCenterPresented = true
                    }

                    Button {
                        isCommunityIdentityPresented = true
                    } label: {
                        MESCLogoMark(size: 34, cornerRadius: 12, focalMark: true)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Identidade e comunidade ativa do MESC")
                }
            }
        }
        .navigationViewStyle(.stack)
        .sheet(isPresented: $isCommunityIdentityPresented) {
            MESCCommunityIdentitySheet()
                .environmentObject(appModel)
        }
    }
}

struct MESCListScreen<Content: View>: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    let title: String
    let subtitle: String
    @ViewBuilder let content: Content
    @State private var isCommunityIdentityPresented = false

    var body: some View {
        NavigationView {
            ZStack {
                MESCBackground()
                list
            }
            .navigationTitle(title)
            .navigationBarTitleDisplayMode(.large)
            .toolbar {
                ToolbarItemGroup(placement: .topBarTrailing) {
                    MESCNotificationBell(unreadCount: appModel.unreadNotificationsCount) {
                        appModel.isNotificationCenterPresented = true
                    }

                    Button {
                        isCommunityIdentityPresented = true
                    } label: {
                        MESCLogoMark(size: 34, cornerRadius: 12, focalMark: true)
                    }
                    .buttonStyle(.plain)
                    .accessibilityLabel("Identidade e comunidade ativa do MESC")
                }
            }
        }
        .navigationViewStyle(.stack)
        .sheet(isPresented: $isCommunityIdentityPresented) {
            MESCCommunityIdentitySheet()
                .environmentObject(appModel)
        }
    }

    @ViewBuilder
    private var list: some View {
        if #available(iOS 16.0, *) {
            listBody.scrollContentBackground(.hidden)
        } else {
            listBody
        }
    }

    private var listBody: some View {
        List {
            Text(subtitle)
                .font(MESCFont.subheadline.weight(.semibold))
                .foregroundStyle(MESCColor.accent)
                .mescListRow(top: 8, bottom: 8)

            content
        }
        .listStyle(.plain)
        .environment(\.defaultMinListRowHeight, 0)
    }
}

struct MESCCommunityIdentitySheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var isDirectoryPresented = false

    var body: some View {
        ZStack {
            MESCBackground()

            VStack(alignment: .leading, spacing: 18) {
                HStack {
                    Text("MESC São Judas Tadeu")
                        .font(MESCFont.cardTitle)
                    Spacer()
                    MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar identidade do MESC") {
                        dismiss()
                    }
                }

                HStack(spacing: 18) {
                    MESCLogoMark(size: 88, cornerRadius: 28)
                    VStack(alignment: .leading, spacing: 5) {
                        Text("Ministrar é servir")
                            .font(MESCFont.title2)
                        Text("Ministério Extraordinário da Sagrada Comunhão")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                            .fixedSize(horizontal: false, vertical: true)
                    }
                }

                GlassPanel(spacing: 6) {
                    Text("Comunidade ativa")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.accent)
                    Text(appModel.activeCommunity?.name ?? "Comunidade MESC")
                        .font(MESCFont.cardTitle)
                    if let parish = appModel.activeCommunity?.parishName, !parish.isEmpty {
                        Text(parish)
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }
                }

                MESCSecondaryButton(title: "Ministros da comunidade", symbol: "person.2") {
                    isDirectoryPresented = true
                }

                MESCSecondaryButton(title: "Atualizar informações", symbol: "arrow.clockwise") {
                    Task { await appModel.reload() }
                }

                Spacer(minLength: 0)
            }
            .padding(22)
        }
        .sheet(isPresented: $isDirectoryPresented) {
            MinistersDirectorySheet()
                .environmentObject(appModel)
        }
    }
}

struct MinistersDirectorySheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    @State private var searchText = ""
    @State private var selectedRole = "Todos"
    @State private var selectedMinister: MobileDirectoryMinisterDTO?

    private var roleFilters: [String] {
        ["Todos"] + Array(Set(appModel.directoryMinisters.map(\.role))).sorted()
    }

    private var filteredMinisters: [MobileDirectoryMinisterDTO] {
        appModel.directoryMinisters.filter { minister in
            let matchesRole = selectedRole == "Todos" || minister.role == selectedRole
            let query = searchText.trimmingCharacters(in: .whitespacesAndNewlines)
            let matchesQuery = query.isEmpty || minister.displayName.localizedCaseInsensitiveContains(query)
            return matchesRole && matchesQuery
        }
    }

    var body: some View {
        NavigationView {
            ZStack {
                MESCBackground()
                directoryList
            }
            .navigationTitle("Ministros")
            .navigationBarTitleDisplayMode(.inline)
            .toolbar {
                ToolbarItem(placement: .topBarLeading) {
                    Menu {
                        ForEach(roleFilters, id: \.self) { role in
                            Button {
                                selectedRole = role
                            } label: {
                                if selectedRole == role {
                                    Label(roleTitle(role), systemImage: "checkmark")
                                } else {
                                    Text(roleTitle(role))
                                }
                            }
                        }
                    } label: {
                        Label("Filtrar", systemImage: "line.3.horizontal.decrease.circle")
                    }
                }

                ToolbarItem(placement: .topBarTrailing) {
                    Button {
                        dismiss()
                    } label: {
                        Image(systemName: "xmark")
                            .font(.system(size: 14, weight: .bold))
                            .foregroundStyle(MESCColor.accent)
                    }
                    .accessibilityLabel("Fechar diretório")
                }
            }
        }
        .navigationViewStyle(.stack)
        .searchable(text: $searchText, prompt: "Buscar ministro")
        .task {
            guard appModel.directoryMinisters.isEmpty, !appModel.isLoadingDirectory else { return }
            await appModel.loadDirectory()
        }
        .refreshable {
            await appModel.loadDirectory()
        }
        .sheet(item: $selectedMinister) { minister in
            MinisterDirectoryDetailSheet(minister: minister)
                .environmentObject(appModel)
        }
    }

    @ViewBuilder
    private var directoryList: some View {
        if #available(iOS 16.0, *) {
            directoryListBody.scrollContentBackground(.hidden)
        } else {
            directoryListBody
        }
    }

    private var directoryListBody: some View {
        List {
            Text("Pessoas que servem na comunidade ativa. Informações de contato permanecem protegidas.")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                .fixedSize(horizontal: false, vertical: true)
                .mescListRow(top: 16, bottom: 10)

            if let message = appModel.directoryMessage {
                Label(message, systemImage: "exclamationmark.triangle")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.primaryWine)
                    .fixedSize(horizontal: false, vertical: true)
                    .mescListRow(top: 4, bottom: 8)
            }

            if appModel.isLoadingDirectory && appModel.directoryMinisters.isEmpty {
                ProgressView()
                    .tint(MESCColor.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 44)
                    .mescListRow()
            } else if filteredMinisters.isEmpty {
                EmptyState(
                    title: searchText.isEmpty ? "Nenhum ministro encontrado" : "Nenhum resultado",
                    detail: searchText.isEmpty
                        ? "Quando houver ministros ativos nesta comunidade, eles aparecerão aqui."
                        : "Tente buscar por outro nome."
                )
                .mescListRow()
            } else {
                ForEach(filteredMinisters) { minister in
                    Button {
                        selectedMinister = minister
                    } label: {
                        MinisterDirectoryRow(minister: minister)
                    }
                    .buttonStyle(.plain)
                    .mescListRow(top: 3, bottom: 3)
                }
            }
        }
        .listStyle(.plain)
        .environment(\.defaultMinListRowHeight, 0)
    }

    private func roleTitle(_ role: String) -> String {
        switch role {
        case "coordenador", "coordenador_comunidade": return "Coordenação"
        case "coordenador_paroquial": return "Coordenação paroquial"
        case "gestor", "reitor": return "Gestão"
        case "Todos": return "Todos"
        default: return "Ministro"
        }
    }
}

private struct MinisterDirectoryRow: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    let minister: MobileDirectoryMinisterDTO
    @State private var image: UIImage?

    var body: some View {
        HStack(spacing: 13) {
            DirectoryMinisterAvatar(image: image, name: minister.displayName, size: 48)

            VStack(alignment: .leading, spacing: 4) {
                Text(minister.displayName)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                    .lineLimit(1)
                Text(roleTitle)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }

            Spacer()

            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .bold))
                .foregroundStyle(MESCColor.accent)
        }
        .padding(.vertical, 8)
        .contentShape(Rectangle())
        .task(id: minister.id) {
            guard image == nil else { return }
            image = await appModel.directoryPhoto(for: minister)
        }
    }

    private var roleTitle: String {
        switch minister.role {
        case "coordenador", "coordenador_comunidade": return "Coordenação da comunidade"
        case "coordenador_paroquial": return "Coordenação paroquial"
        case "gestor", "reitor": return "Gestão pastoral"
        default: return "Ministro extraordinário da comunhão"
        }
    }
}

private struct MinisterDirectoryDetailSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let minister: MobileDirectoryMinisterDTO
    @State private var image: UIImage?

    var body: some View {
        ZStack {
            MESCBackground()

            VStack(alignment: .leading, spacing: 20) {
                HStack {
                    Text("Ministro da comunidade")
                        .font(MESCFont.cardTitle)
                    Spacer()
                    MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar perfil do ministro") {
                        dismiss()
                    }
                }

                HStack(spacing: 16) {
                    DirectoryMinisterAvatar(image: image, name: minister.displayName, size: 82)
                    VStack(alignment: .leading, spacing: 5) {
                        Text(minister.displayName)
                            .font(MESCFont.title2)
                            .fixedSize(horizontal: false, vertical: true)
                        Text(roleTitle)
                            .font(MESCFont.callout)
                            .foregroundStyle(MESCColor.accent)
                    }
                }

                GlassPanel(spacing: 8) {
                    SectionTitle(title: "Comunidade", symbol: "building.columns")
                    Text(appModel.activeCommunity?.name ?? "Comunidade ativa")
                        .font(MESCFont.body)
                        .foregroundStyle(MESCColor.textSecondary)
                    Text("Dados pessoais e formas de contato são compartilhados apenas quando a coordenação autorizar.")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }

                Spacer()
            }
            .padding(22)
        }
        .task(id: minister.id) {
            guard image == nil else { return }
            image = await appModel.directoryPhoto(for: minister)
        }
    }

    private var roleTitle: String {
        switch minister.role {
        case "coordenador", "coordenador_comunidade": return "Coordenação da comunidade"
        case "coordenador_paroquial": return "Coordenação paroquial"
        case "gestor", "reitor": return "Gestão pastoral"
        default: return "Ministro extraordinário da comunhão"
        }
    }
}

private struct DirectoryMinisterAvatar: View {
    let image: UIImage?
    let name: String
    let size: CGFloat

    var body: some View {
        Group {
            if let image {
                Image(uiImage: image)
                    .resizable()
                    .scaledToFill()
            } else {
                Circle()
                    .fill(MESCColor.primaryWine.opacity(0.88))
                    .overlay(
                        Text(initials)
                            .font(.system(size: size * 0.32, weight: .bold))
                            .foregroundStyle(.white)
                    )
            }
        }
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(MESCColor.gold.opacity(0.45), lineWidth: 1))
    }

    private var initials: String {
        name
            .split(separator: " ")
            .prefix(2)
            .compactMap { $0.first }
            .map(String.init)
            .joined()
            .uppercased()
    }
}

struct MESCNotificationBell: View {
    let unreadCount: Int
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            ZStack(alignment: .topTrailing) {
                Image(systemName: unreadCount > 0 ? "bell.badge.fill" : "bell")
                    .font(.system(size: 16, weight: .bold))
                    .foregroundStyle(MESCColor.accent)
                    .frame(width: 42, height: 42)
                    .mescLiveGlass(cornerRadius: 14)

                if unreadCount > 0 {
                    Text(unreadCount > 9 ? "9+" : "\(unreadCount)")
                        .font(.system(size: 10, weight: .bold, design: .rounded))
                        .foregroundStyle(.white)
                        .frame(minWidth: 17, minHeight: 17)
                        .padding(.horizontal, unreadCount > 9 ? 2 : 0)
                        .background(MESCColor.primaryWine, in: Capsule())
                        .overlay(Capsule().stroke(MESCColor.surface.opacity(0.9), lineWidth: 1))
                        .offset(x: 5, y: -5)
                }
            }
        }
        .buttonStyle(.plain)
        .accessibilityLabel(unreadCount == 0 ? "Notificações" : "Notificações, \(unreadCount) não lidas")
    }
}

struct MESCNotificationCenterSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let onOpenDeepLink: (String) -> Void

    var body: some View {
        ZStack {
            MESCBackground()

            notificationsList
        }
        .task {
            await appModel.loadNotifications()
        }
        .refreshable {
            await appModel.loadNotifications()
        }
    }

    @ViewBuilder
    private var notificationsList: some View {
        if #available(iOS 16.0, *) {
            notificationsListBody.scrollContentBackground(.hidden)
        } else {
            notificationsListBody
        }
    }

    private var notificationsListBody: some View {
        List {
            header.mescListRow(top: 22, bottom: 8)

            if appModel.isLoadingNotifications && appModel.notifications.isEmpty {
                ProgressView()
                    .tint(MESCColor.accent)
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 44)
                    .mescListRow()
            } else if appModel.notifications.isEmpty {
                GlassPanel(spacing: 10) {
                    VStack(spacing: 10) {
                        Image(systemName: "bell.slash")
                            .font(.system(size: 28, weight: .semibold))
                            .foregroundStyle(MESCColor.gold)
                        Text("Nenhum aviso por enquanto")
                            .font(MESCFont.body.weight(.semibold))
                        Text("Questionários, escalas, substituições e formações aparecerão aqui.")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                            .multilineTextAlignment(.center)
                    }
                    .frame(maxWidth: .infinity)
                    .padding(.vertical, 18)
                }
                .mescListRow()
            } else {
                if appModel.unreadNotificationsCount > 0 {
                    MESCSecondaryButton(
                        title: appModel.isMarkingAllNotificationsRead ? "Marcando..." : "Marcar todas como lidas",
                        symbol: "checkmark.circle"
                    ) {
                        Task { await appModel.markAllNotificationsRead() }
                    }
                    .disabled(appModel.isMarkingAllNotificationsRead)
                    .mescListRow(top: 4, bottom: 6)
                }

                if let message = appModel.notificationMessage {
                    Label(message, systemImage: "exclamationmark.triangle")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.primaryWine)
                        .fixedSize(horizontal: false, vertical: true)
                        .padding(.horizontal, 4)
                        .mescListRow(top: 2, bottom: 4)
                }

                ForEach(appModel.notifications) { notification in
                    Button {
                        Task {
                            _ = await appModel.markNotificationRead(notification)
                            dismiss()
                            onOpenDeepLink(notification.deepLink)
                        }
                    } label: {
                        MESCNotificationRow(
                            notification: notification,
                            isMarkingRead: appModel.markingNotificationId == notification.id
                        )
                    }
                    .buttonStyle(.plain)
                    .disabled(appModel.markingNotificationId == notification.id)
                    .mescListRow(top: 3, bottom: 5)
                }
            }
        }
        .listStyle(.plain)
        .environment(\.defaultMinListRowHeight, 0)
    }

    private var header: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text("Central")
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
                Text("Notificações")
                    .font(MESCFont.screenTitle)
                    .foregroundStyle(MESCColor.textPrimary)
            }

            Spacer()

            MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar notificações") {
                dismiss()
            }
        }
        .padding(16)
        .mescGlass(cornerRadius: 24, intensity: .floating)
    }
}

struct MESCNotificationRow: View {
    let notification: MobileNotificationDTO
    let isMarkingRead: Bool

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            SymbolTile(symbol: symbol, tint: tint)

            VStack(alignment: .leading, spacing: 5) {
                Text(notification.title)
                    .font(MESCFont.body.weight(notification.read ? .medium : .bold))
                    .foregroundStyle(MESCColor.textPrimary)
                    .multilineTextAlignment(.leading)
                Text(notification.message)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .multilineTextAlignment(.leading)
                    .fixedSize(horizontal: false, vertical: true)
                if let createdAt = notification.createdAt {
                    Text(MESCNativeAppModel.compactDateTimeLabel(createdAt))
                        .font(MESCFont.caption2)
                        .foregroundStyle(MESCColor.textSecondary)
                }
            }

            Spacer(minLength: 4)

            if isMarkingRead {
                ProgressView()
                    .tint(MESCColor.accent)
            } else if !notification.read {
                Circle()
                    .fill(MESCColor.gold)
                    .frame(width: 9, height: 9)
            }
        }
        .padding(14)
        .frame(maxWidth: .infinity, alignment: .leading)
        .mescGlass(cornerRadius: 18)
        .opacity(notification.read ? 0.78 : 1)
    }

    private var symbol: String {
        switch notification.type {
        case "schedule":
            return "calendar"
        case "substitution":
            return "arrow.triangle.2.circlepath"
        case "formation":
            return "graduationcap"
        case "questionnaire":
            return "list.clipboard"
        case "announcement":
            return "megaphone"
        default:
            return "bell"
        }
    }

    private var tint: Color {
        if notification.priority == "high" {
            return MESCColor.primaryWine
        }
        return notification.read ? MESCColor.textSecondary : MESCColor.accent
    }
}

struct MESCLogoMark: View {
    let size: CGFloat
    let cornerRadius: CGFloat
    var focalMark = false

    var body: some View {
        Image("Splash")
            .resizable()
            .scaledToFill()
            .scaleEffect(focalMark ? 1.65 : 1)
            .offset(y: focalMark ? size * 0.34 : 0)
            .frame(width: size, height: size)
            .clipShape(RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                    .stroke(Color.white.opacity(0.34), lineWidth: 1)
            )
            .shadow(color: MESCColor.gold.opacity(0.24), radius: 28, x: 0, y: 14)
    }
}

struct GlassPanel<Content: View>: View {
    var spacing: CGFloat = 12
    @ViewBuilder let content: Content

    var body: some View {
        VStack(alignment: .leading, spacing: spacing) {
            content
        }
        .frame(maxWidth: .infinity, alignment: .leading)
        .padding(18)
        .mescGlass(cornerRadius: 22)
    }
}

struct SectionTitle: View {
    let title: String
    let symbol: String

    var body: some View {
        HStack(spacing: 8) {
            Image(systemName: symbol)
                .foregroundStyle(MESCColor.accent)
            Text(title)
                .font(MESCFont.cardTitle)
        }
        .foregroundStyle(MESCColor.textPrimary)
    }
}

struct MESCGlassSegmentedControl<Option: Identifiable & Hashable>: View {
    let options: [Option]
    @Binding var selection: Option
    let title: (Option) -> String
    let symbol: (Option) -> String

    var body: some View {
        HStack(spacing: 6) {
            ForEach(options) { option in
                let isSelected = selection == option

                Button {
                    withAnimation(.spring(response: 0.26, dampingFraction: 0.86)) {
                        selection = option
                    }
                } label: {
                    VStack(spacing: 5) {
                        Image(systemName: symbol(option))
                            .font(.system(size: 17, weight: .semibold))
                        Text(title(option))
                            .font(MESCFont.caption2.weight(.semibold))
                            .lineLimit(1)
                            .minimumScaleFactor(0.70)
                    }
                    .frame(maxWidth: .infinity)
                    .frame(height: 58)
                    .foregroundStyle(isSelected ? MESCColor.accent : MESCColor.textSecondary)
                    .background {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .fill(isSelected ? MESCColor.gold.opacity(0.14) : Color.clear)
                            .background(isSelected ? .thinMaterial : .ultraThinMaterial, in: RoundedRectangle(cornerRadius: 16, style: .continuous))
                    }
                    .overlay {
                        RoundedRectangle(cornerRadius: 16, style: .continuous)
                            .stroke(isSelected ? MESCColor.gold.opacity(0.32) : MESCColor.separator.opacity(0.26), lineWidth: 1)
                    }
                }
                .buttonStyle(.plain)
                .accessibilityLabel(title(option))
            }
        }
        .padding(6)
        .mescGlass(cornerRadius: 22, intensity: .floating)
    }
}

struct MESCIconButton: View {
    let symbol: String
    let accessibilityLabel: String
    var isDisabled = false
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            Image(systemName: symbol)
                .font(.system(size: 16, weight: .bold))
                .foregroundStyle(isDisabled ? MESCColor.textSecondary.opacity(0.45) : MESCColor.accent)
                .frame(width: 42, height: 42)
                .mescGlass(cornerRadius: 14)
        }
        .buttonStyle(.plain)
        .disabled(isDisabled)
        .accessibilityLabel(accessibilityLabel)
    }
}

struct SymbolTile: View {
    let symbol: String
    let tint: Color

    var body: some View {
        Image(systemName: symbol)
            .font(.system(size: 20, weight: .semibold))
            .foregroundStyle(tint)
            .frame(width: 44, height: 44)
            .background(tint.opacity(0.12), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
    }
}

struct StatusPill: View {
    let title: String
    let symbol: String
    let tint: Color

    var body: some View {
        Label(title, systemImage: symbol)
            .font(.system(size: 13, weight: .semibold))
            .foregroundStyle(tint)
            .lineLimit(1)
            .minimumScaleFactor(0.8)
            .frame(maxWidth: .infinity)
            .padding(.vertical, 12)
            .padding(.horizontal, 10)
            .mescGlass(cornerRadius: 16)
    }
}

struct MissionRow: View {
    let time: String
    let title: String
    let detail: String

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            Text(time)
                .font(.system(size: 14, weight: .bold, design: .rounded))
                .foregroundStyle(MESCColor.accent)
                .frame(width: 48, alignment: .leading)

            VStack(alignment: .leading, spacing: 3) {
                Text(title)
                    .font(MESCFont.body.weight(.semibold))
                Text(detail)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
            }
        }
    }
}

struct PendingActionRow: View {
    let action: MobilePendingActionDTO

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            SymbolTile(symbol: symbol, tint: tint)
            VStack(alignment: .leading, spacing: 4) {
                Text(action.title)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                if let subtitle = action.subtitle, !subtitle.isEmpty {
                    Text(subtitle)
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                }
                if let dueAt = action.dueAt {
                    Text("Prazo: \(MESCNativeAppModel.compactDateTimeLabel(dueAt))")
                        .font(MESCFont.caption2)
                        .foregroundStyle(MESCColor.accent)
                }
            }
            Spacer()
            Image(systemName: "chevron.right")
                .font(.system(size: 13, weight: .semibold))
                .foregroundStyle(MESCColor.textSecondary)
        }
        .padding(12)
        .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var symbol: String {
        switch action.type {
        case "questionnaire":
            return "list.clipboard"
        case "substitution":
            return "arrow.triangle.2.circlepath"
        default:
            return "exclamationmark.circle"
        }
    }

    private var tint: Color {
        action.priority == "high" ? MESCColor.primaryWine : MESCColor.gold
    }
}

struct NoticeSummaryRow: View {
    let notice: MobileNoticeDTO

    var body: some View {
        HStack(alignment: .top, spacing: 12) {
            SymbolTile(symbol: symbol, tint: notice.read ? MESCColor.textSecondary : MESCColor.accent)
            VStack(alignment: .leading, spacing: 4) {
                Text(notice.title)
                    .font(MESCFont.body.weight(.semibold))
                    .foregroundStyle(MESCColor.textPrimary)
                Text(notice.message)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
                if let createdAt = notice.createdAt {
                    Text(MESCNativeAppModel.compactDateTimeLabel(createdAt))
                        .font(MESCFont.caption2)
                        .foregroundStyle(MESCColor.textSecondary)
                }
            }
            Spacer()
            if !notice.read {
                Circle()
                    .fill(MESCColor.gold)
                    .frame(width: 8, height: 8)
            }
        }
        .padding(12)
        .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 18, style: .continuous))
    }

    private var symbol: String {
        switch notice.type {
        case "schedule":
            return "calendar"
        case "substitution":
            return "arrow.triangle.2.circlepath"
        case "formation":
            return "graduationcap"
        default:
            return "bell"
        }
    }
}

struct ScheduleMissionRow: View {
    let mission: ScheduleMission
    let onOpenDetails: () -> Void

    var body: some View {
        Button(action: onOpenDetails) {
            HStack(alignment: .top, spacing: 12) {
                VStack(spacing: 5) {
                    Text(mission.time)
                        .font(.system(size: 14, weight: .bold, design: .rounded))
                        .foregroundStyle(MESCColor.accent)
                    Image(systemName: mission.isCurrentUser ? "person.crop.circle.badge.checkmark" : "person.2")
                        .font(.system(size: 14, weight: .semibold))
                        .foregroundStyle(mission.isCurrentUser ? MESCColor.gold : MESCColor.textSecondary)
                }
                .frame(width: 54)

                VStack(alignment: .leading, spacing: 8) {
                    HStack(alignment: .firstTextBaseline, spacing: 8) {
                        Text(mission.title)
                            .font(MESCFont.cardTitle)
                            .foregroundStyle(MESCColor.textPrimary)
                        Spacer()
                        Image(systemName: "chevron.right")
                            .font(.system(size: 13, weight: .bold))
                            .foregroundStyle(MESCColor.accent)
                    }

                    Text(mission.community)
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .lineLimit(1)

                    if mission.isCurrentUser {
                        Label(mission.role, systemImage: "person.text.rectangle")
                            .font(MESCFont.caption.weight(.semibold))
                            .foregroundStyle(MESCColor.accent)
                    } else {
                        Text("\(mission.positions.count) ministros escalados")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.textSecondary)
                    }

                    if mission.canEditMass {
                        Label("Você pode organizar esta missa", systemImage: "pencil.circle")
                            .font(MESCFont.caption)
                            .foregroundStyle(MESCColor.gold)
                    }
                }
            }
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .mescGlass(cornerRadius: 18)
        }
        .buttonStyle(.plain)
        .accessibilityHint("Abre a equipe e os detalhes desta missa")
    }
}

struct ScheduleMassDetailSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let mission: ScheduleMission
    let dayTitle: String
    var onConfirm: (() -> Void)?
    var onRequestSubstitution: (() -> Void)?
    @State private var isEditorPresented = false

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: 18) {
                    GlassPanel(spacing: 12) {
                        HStack(alignment: .top, spacing: 12) {
                            SymbolTile(symbol: "calendar.badge.clock", tint: MESCColor.gold)
                            VStack(alignment: .leading, spacing: 5) {
                                Text(dayTitle)
                                    .font(MESCFont.caption)
                                    .foregroundStyle(MESCColor.accent)
                                Text(mission.title)
                                    .font(MESCFont.title2)
                                Text("\(mission.time) - \(mission.community)")
                                    .font(MESCFont.body)
                                    .foregroundStyle(MESCColor.textSecondary)
                                    .fixedSize(horizontal: false, vertical: true)
                            }
                            Spacer()
                            MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar detalhes da missa") {
                                dismiss()
                            }
                        }
                    }

                    if mission.isCurrentUser {
                        GlassPanel(spacing: 8) {
                            SectionTitle(title: "Sua escala", symbol: "person.text.rectangle")
                            Text(mission.role)
                                .font(MESCFont.cardTitle)
                                .foregroundStyle(MESCColor.accent)
                            Text(confirmationDetail)
                                .font(MESCFont.caption)
                                .foregroundStyle(confirmationTint)

                            if onConfirm != nil || onRequestSubstitution != nil {
                                HStack(spacing: 10) {
                                    if let onConfirm {
                                        MESCPrimaryButton(title: "Confirmar", symbol: "checkmark.circle", action: onConfirm)
                                    }
                                    if let onRequestSubstitution {
                                        MESCSecondaryButton(title: "Pedir troca", symbol: "arrow.triangle.2.circlepath", action: onRequestSubstitution)
                                    }
                                }
                            }
                        }
                    }

                    GlassPanel(spacing: 10) {
                        HStack {
                            SectionTitle(title: "Equipe escalada", symbol: "person.2")
                            Spacer()
                            Text("\(mission.positions.count)")
                                .font(MESCFont.caption.weight(.bold))
                                .foregroundStyle(MESCColor.accent)
                        }

                        ForEach(mission.positions) { position in
                            SchedulePositionRow(position: position)
                        }
                    }

                    if mission.canEditMass, let scheduleId = mission.scheduleId, !scheduleId.hasPrefix("adoration-") {
                        GlassPanel(spacing: 10) {
                            SectionTitle(title: "Organizar a missa", symbol: "slider.horizontal.3")
                            Text("Nas posições 1 ou 2 desta missa, você pode ajustar os ministros e as vagas desta equipe.")
                                .font(MESCFont.body)
                                .foregroundStyle(MESCColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)
                            MESCSecondaryButton(title: "Editar escala desta missa", symbol: "pencil") {
                                isEditorPresented = true
                            }
                        }
                        .sheet(isPresented: $isEditorPresented) {
                            ScheduleMassEditorSheet(anchorScheduleId: scheduleId)
                                .environmentObject(appModel)
                        }
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 34)
            }
        }
    }

    private var confirmationDetail: String {
        switch mission.confirmationStatus {
        case "confirmed": return "Presença confirmada"
        case "declined": return "Presença recusada"
        case "pending": return "Aguardando sua confirmação"
        default: return mission.canConfirm ? "Aguardando sua confirmação" : "Escala registrada"
        }
    }

    private var confirmationTint: Color {
        switch mission.confirmationStatus {
        case "confirmed": return MESCColor.accent
        case "declined": return MESCColor.primaryWine
        default: return MESCColor.gold
        }
    }
}

struct SchedulePositionRow: View {
    let position: SchedulePosition

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            VStack(alignment: .leading, spacing: 3) {
                Text(MESCNativeAppModel.positionDisplayLabel(position.position))
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
                Text(position.isVacant ? "Vaga disponível" : position.displayName)
                    .font(MESCFont.body.weight(position.isCurrentUser ? .bold : .semibold))
                    .foregroundStyle(position.isVacant ? MESCColor.textSecondary : MESCColor.textPrimary)
            }

            Spacer()

            if position.isCurrentUser {
                Image(systemName: "person.crop.circle.fill.badge.checkmark")
                    .foregroundStyle(MESCColor.gold)
                    .accessibilityLabel("Sua posição")
            }
        }
        .padding(.vertical, 7)
    }
}

struct ScheduleMassEditorSheet: View {
    @EnvironmentObject private var appModel: MESCNativeAppModel
    @Environment(\.dismiss) private var dismiss
    let anchorScheduleId: String
    @State private var selections: [String: String] = [:]

    var body: some View {
        ZStack {
            MESCBackground()

            ScrollView(showsIndicators: false) {
                LazyVStack(alignment: .leading, spacing: 18) {
                    header

                    if appModel.isLoadingScheduleEditor && appModel.scheduleEditor == nil {
                        ProgressView()
                            .tint(MESCColor.accent)
                            .frame(maxWidth: .infinity)
                            .padding(.vertical, 44)
                    } else if let editor = appModel.scheduleEditor {
                        GlassPanel(spacing: 10) {
                            SectionTitle(title: "Posições desta missa", symbol: "person.2")
                            Text("As alterações atualizam a escala publicada e removem a confirmação anterior daquela posição.")
                                .font(MESCFont.caption)
                                .foregroundStyle(MESCColor.textSecondary)
                                .fixedSize(horizontal: false, vertical: true)

                            ForEach(editor.mass.assignments) { assignment in
                                editorRow(assignment, editor: editor)
                            }
                        }

                        if let message = appModel.scheduleEditorMessage {
                            Label(message, systemImage: message == "Escala atualizada." ? "checkmark.seal" : "info.circle")
                                .font(MESCFont.caption)
                                .foregroundStyle(message == "Escala atualizada." ? MESCColor.accent : MESCColor.primaryWine)
                        }

                        MESCPrimaryButton(
                            title: appModel.isSavingScheduleEditor ? "Atualizando..." : "Salvar alterações",
                            symbol: "checkmark.circle"
                        ) {
                            Task { await saveChanges(editor) }
                        }
                        .disabled(!hasChanges(editor) || appModel.isSavingScheduleEditor)
                    } else {
                        EmptyState(
                            title: "Não foi possível abrir a edição",
                            detail: appModel.scheduleEditorMessage ?? "Atualize a tela e tente novamente."
                        )
                    }
                }
                .padding(.horizontal, 18)
                .padding(.top, 22)
                .padding(.bottom, 34)
            }
        }
        .task {
            await appModel.loadScheduleEditor(scheduleId: anchorScheduleId)
            if let editor = appModel.scheduleEditor {
                selections = Dictionary(uniqueKeysWithValues: editor.mass.assignments.map {
                    ($0.id, $0.ministerId ?? "")
                })
            }
        }
    }

    private var header: some View {
        HStack(alignment: .top, spacing: 12) {
            VStack(alignment: .leading, spacing: 5) {
                Text("Organizar escala")
                    .font(MESCFont.screenTitle)
                if let mass = appModel.scheduleEditor?.mass {
                    Text("\(MESCNativeAppModel.scheduleDateTitle(date: mass.date)) às \(MESCNativeAppModel.timeLabel(mass.time))")
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
            }
            Spacer()
            MESCIconButton(symbol: "xmark", accessibilityLabel: "Fechar edição da escala") {
                dismiss()
            }
        }
        .padding(16)
        .mescGlass(cornerRadius: 24, intensity: .floating)
    }

    private func editorRow(
        _ assignment: MobileScheduleEditorAssignmentDTO,
        editor: MobileScheduleEditorDTO
    ) -> some View {
        HStack(alignment: .center, spacing: 10) {
            VStack(alignment: .leading, spacing: 2) {
                Text(MESCNativeAppModel.positionDisplayLabel(assignment.position))
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.accent)
                Picker("Ministro para \(MESCNativeAppModel.positionDisplayLabel(assignment.position))", selection: selectionBinding(for: assignment)) {
                    Text("Vaga disponível").tag("")
                    ForEach(editor.ministers) { minister in
                        Text(minister.displayName).tag(minister.id)
                    }
                }
                .labelsHidden()
                .pickerStyle(.menu)
                .font(MESCFont.body.weight(.semibold))
            }
            Spacer(minLength: 0)
        }
        .padding(.vertical, 7)
    }

    private func selectionBinding(for assignment: MobileScheduleEditorAssignmentDTO) -> Binding<String> {
        Binding(
            get: { selections[assignment.id] ?? assignment.ministerId ?? "" },
            set: { selections[assignment.id] = $0 }
        )
    }

    private func hasChanges(_ editor: MobileScheduleEditorDTO) -> Bool {
        editor.mass.assignments.contains { assignment in
            (selections[assignment.id] ?? assignment.ministerId ?? "") != (assignment.ministerId ?? "")
        }
    }

    private func saveChanges(_ editor: MobileScheduleEditorDTO) async {
        for assignment in editor.mass.assignments where (selections[assignment.id] ?? assignment.ministerId ?? "") != (assignment.ministerId ?? "") {
            let selectedId = selections[assignment.id] ?? ""
            let didSave = await appModel.updateScheduleAssignment(
                scheduleId: assignment.scheduleId,
                ministerId: selectedId.isEmpty ? nil : selectedId
            )
            if !didSave { return }
        }
        dismiss()
    }
}

struct FormationLessonRow: View {
    let title: String
    let progress: Double
    let detail: String

    var body: some View {
        VStack(alignment: .leading, spacing: 9) {
            HStack {
                VStack(alignment: .leading, spacing: 3) {
                    Text(title)
                        .font(MESCFont.body.weight(.semibold))
                    Text(detail)
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                }
                Spacer()
                Image(systemName: "chevron.right")
                    .foregroundStyle(MESCColor.accent)
            }

            ProgressView(value: progress)
                .tint(MESCColor.accent)
        }
        .padding(14)
        .background(MESCColor.surface.opacity(0.68), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
    }
}

struct ProfileInfoRow: View {
    let title: String
    let value: String

    var body: some View {
        HStack {
            Text(title)
                .font(MESCFont.body)
                .foregroundStyle(MESCColor.textSecondary)
            Spacer()
            Text(value)
                .font(MESCFont.body.weight(.semibold))
                .multilineTextAlignment(.trailing)
        }
    }
}

struct SettingsToggleRow: View {
    let title: String
    let detail: String
    let symbol: String
    @Binding var isOn: Bool

    var body: some View {
        HStack(alignment: .center, spacing: 12) {
            SymbolTile(symbol: symbol, tint: isOn ? MESCColor.accent : MESCColor.textSecondary)

            VStack(alignment: .leading, spacing: 4) {
                Text(title)
                    .font(MESCFont.body.weight(.semibold))
                Text(detail)
                    .font(MESCFont.caption)
                    .foregroundStyle(MESCColor.textSecondary)
                    .fixedSize(horizontal: false, vertical: true)
            }

            Spacer()

            Toggle("", isOn: $isOn)
                .labelsHidden()
        }
        .padding(.vertical, 6)
    }
}

struct NativePermissionRow: View {
    let title: String
    let detail: String
    let status: String
    let symbol: String
    let isEnabled: Bool
    let actionTitle: String
    let action: () -> Void

    var body: some View {
        Button(action: action) {
            HStack(alignment: .center, spacing: 12) {
                SymbolTile(symbol: symbol, tint: isEnabled ? MESCColor.accent : MESCColor.textSecondary)

                VStack(alignment: .leading, spacing: 4) {
                    Text(title)
                        .font(MESCFont.body.weight(.semibold))
                    Text(detail)
                        .font(MESCFont.caption)
                        .foregroundStyle(MESCColor.textSecondary)
                        .fixedSize(horizontal: false, vertical: true)
                    Text(status)
                        .font(MESCFont.caption2)
                        .foregroundStyle(isEnabled ? MESCColor.gold : MESCColor.accent)
                }

                Spacer()

                VStack(alignment: .trailing, spacing: 6) {
                    Image(systemName: isEnabled ? "checkmark.circle.fill" : "chevron.right")
                        .font(.system(size: 20, weight: .semibold))
                        .foregroundStyle(isEnabled ? MESCColor.gold : MESCColor.textSecondary)

                    Text(actionTitle)
                        .font(MESCFont.caption2.weight(.semibold))
                        .foregroundStyle(isEnabled ? MESCColor.gold : MESCColor.accent)
                        .lineLimit(1)
                        .minimumScaleFactor(0.78)
                }
            }
            .padding(.vertical, 6)
        }
        .buttonStyle(.plain)
    }
}

struct NotificationTypeRow: View {
    let title: String
    let enabled: Bool

    var body: some View {
        HStack {
            Circle()
                .fill(enabled ? MESCColor.gold : MESCColor.textSecondary.opacity(0.3))
                .frame(width: 8, height: 8)
            Text(title)
                .font(MESCFont.body)
            Spacer()
            Text(enabled ? "Ativo" : "Inativo")
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
        }
    }
}

struct EmptyState: View {
    let title: String
    let detail: String

    var body: some View {
        VStack(alignment: .center, spacing: 8) {
            Image(systemName: "calendar.badge.exclamationmark")
                .font(.system(size: 26, weight: .semibold))
                .foregroundStyle(MESCColor.gold)
            Text(title)
                .font(MESCFont.body.weight(.semibold))
            Text(detail)
                .font(MESCFont.caption)
                .foregroundStyle(MESCColor.textSecondary)
                .multilineTextAlignment(.center)
        }
        .frame(maxWidth: .infinity)
        .padding(.vertical, 20)
    }
}

struct FallbackBanner: View {
    var body: some View {
        Label("Dados locais temporários. Toque em Atualizar nos Ajustes para tentar sincronizar novamente.", systemImage: "wifi.exclamationmark")
            .font(MESCFont.caption)
            .foregroundStyle(MESCColor.primaryWine)
            .fixedSize(horizontal: false, vertical: true)
            .padding(14)
            .frame(maxWidth: .infinity, alignment: .leading)
            .background(MESCColor.gold.opacity(0.12), in: RoundedRectangle(cornerRadius: 16, style: .continuous))
            .overlay(
                RoundedRectangle(cornerRadius: 16, style: .continuous)
                    .stroke(MESCColor.gold.opacity(0.24), lineWidth: 1)
            )
    }
}

struct MESCPrimaryButton: View {
    let title: String
    let symbol: String
    let action: () -> Void

    init(title: String, symbol: String, action: @escaping () -> Void = {}) {
        self.title = title
        self.symbol = symbol
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.system(size: 15, weight: .bold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 14)
                .foregroundStyle(.white)
                .background(MESCColor.primaryWine, in: RoundedRectangle(cornerRadius: 14, style: .continuous))
        }
        .buttonStyle(.plain)
    }
}

struct MESCSecondaryButton: View {
    let title: String
    let symbol: String
    let action: () -> Void

    init(title: String, symbol: String, action: @escaping () -> Void = {}) {
        self.title = title
        self.symbol = symbol
        self.action = action
    }

    var body: some View {
        Button(action: action) {
            Label(title, systemImage: symbol)
                .font(.system(size: 15, weight: .semibold))
                .frame(maxWidth: .infinity)
                .padding(.vertical, 13)
                .foregroundStyle(MESCColor.accent)
                .background(MESCColor.surface.opacity(0.66), in: RoundedRectangle(cornerRadius: 14, style: .continuous))
                .overlay(
                    RoundedRectangle(cornerRadius: 14, style: .continuous)
                        .stroke(MESCColor.gold.opacity(0.24), lineWidth: 1)
                )
        }
        .buttonStyle(.plain)
    }
}

struct MESCBackground: View {
    var body: some View {
        ZStack {
            LinearGradient(
                colors: [
                    MESCColor.background,
                    MESCColor.background,
                    MESCColor.ivoryWarm
                ],
                startPoint: .topLeading,
                endPoint: .bottomTrailing
            )

            LinearGradient(
                colors: [
                    Color.white.opacity(0.18),
                    MESCColor.gold.opacity(0.055),
                    Color.clear
                ],
                startPoint: .topLeading,
                endPoint: .center
            )

            LinearGradient(
                colors: [
                    Color.clear,
                    MESCColor.primaryWine.opacity(0.035),
                    MESCColor.gold.opacity(0.045)
                ],
                startPoint: .top,
                endPoint: .bottomTrailing
            )
        }
        .ignoresSafeArea()
    }
}

enum MESCGlassIntensity {
    case panel
    case floating

    var tint: Color {
        switch self {
        case .panel:
            return MESCColor.glassTint
        case .floating:
            return MESCColor.glassFloatingTint
        }
    }

    var base: Color {
        switch self {
        case .panel:
            return MESCColor.glassBase
        case .floating:
            return MESCColor.glassFloatingBase
        }
    }

    var shadowOpacity: Double {
        switch self {
        case .panel:
            return 0.08
        case .floating:
            return 0.12
        }
    }

    var highlightOpacity: Double {
        switch self {
        case .panel:
            return 0.16
        case .floating:
            return 0.22
        }
    }
}

extension View {
    func mescListRow(top: CGFloat = 6, bottom: CGFloat = 6) -> some View {
        listRowInsets(EdgeInsets(top: top, leading: 18, bottom: bottom, trailing: 18))
            .listRowBackground(Color.clear)
            .listRowSeparator(.hidden)
    }

    @ViewBuilder
    func mescGlass(cornerRadius: CGFloat, intensity: MESCGlassIntensity = .panel) -> some View {
        // Cards move with the scroll view, so their finish must not continuously sample
        // and blur the backdrop. The static refraction keeps the glass language intact.
        self
            .background(intensity.base, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
            .overlay(glassRefraction(cornerRadius: cornerRadius, opacity: intensity.highlightOpacity))
            .overlay(glassBorder(cornerRadius: cornerRadius))
            .shadow(
                color: MESCColor.primaryWine.opacity(intensity.shadowOpacity * 0.72),
                radius: intensity == .floating ? 10 : 7,
                x: 0,
                y: intensity == .floating ? 5 : 4
            )
            .shadow(
                color: Color.white.opacity(intensity == .floating ? 0.18 : 0.12),
                radius: 0.5,
                x: -0.5,
                y: -0.5
            )
    }

    @ViewBuilder
    func mescLiveGlass(cornerRadius: CGFloat, intensity: MESCGlassIntensity = .floating) -> some View {
        if #available(iOS 26.0, *) {
            self
                .background(intensity.base, in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous))
                .glassEffect(
                    .regular.tint(intensity.tint),
                    in: RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
                )
                .overlay(glassRefraction(cornerRadius: cornerRadius, opacity: intensity.highlightOpacity))
                .overlay(glassBorder(cornerRadius: cornerRadius))
                .shadow(color: MESCColor.primaryWine.opacity(intensity.shadowOpacity), radius: 10, x: 0, y: 5)
                .shadow(color: Color.white.opacity(0.20), radius: 0.5, x: -0.5, y: -0.5)
        } else {
            mescGlass(cornerRadius: cornerRadius, intensity: intensity)
        }
    }

    private func glassBorder(cornerRadius: CGFloat) -> some View {
        RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)
            .strokeBorder(
                LinearGradient(
                    colors: [
                        Color.white.opacity(0.42),
                        MESCColor.gold.opacity(0.22),
                        Color.white.opacity(0.12)
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                ),
                lineWidth: 1
            )
    }

    private func glassRefraction(cornerRadius: CGFloat, opacity: Double) -> some View {
        let shape = RoundedRectangle(cornerRadius: cornerRadius, style: .continuous)

        return shape
            .fill(
                LinearGradient(
                    colors: [
                        Color.white.opacity(opacity),
                        Color.white.opacity(opacity * 0.16),
                        MESCColor.gold.opacity(opacity * 0.26),
                        Color.clear
                    ],
                    startPoint: .topLeading,
                    endPoint: .bottomTrailing
                )
            )
            .overlay(shape.stroke(Color.white.opacity(opacity * 0.52), lineWidth: 0.5))
            .allowsHitTesting(false)
    }
}

enum MESCColor {
    static let primaryRed = Color(hex: 0x8B0000)
    static let primaryWine = Color(hex: 0x722F37)
    static let accent = dynamic(light: 0x722F37, dark: 0xC5A059)
    static let gold = Color(hex: 0xC5A059)
    static let goldMuted = Color(hex: 0xB38F4D)
    static let background = dynamic(light: 0xFDFBF7, dark: 0x1A1A1A)
    static let ivoryWarm = dynamic(light: 0xF6EFE2, dark: 0x1C1C1E)
    static let graphite = Color(hex: 0x1A1A1A)
    static let textPrimary = dynamic(light: 0x1A1A1A, dark: 0xEDEDED)
    static let textSecondary = dynamic(light: 0x727272, dark: 0x8A8A8A)
    static let surface = dynamic(light: 0xFFFFFF, dark: 0x1C1C1E, lightAlpha: 0.74, darkAlpha: 0.74)
    static let glassBase = dynamic(light: 0xFFFFFF, dark: 0x1C1C1E, lightAlpha: 0.12, darkAlpha: 0.18)
    static let glassTint = dynamic(light: 0xFFFFFF, dark: 0xEDEDED, lightAlpha: 0.08, darkAlpha: 0.04)
    static let glassFloatingBase = dynamic(light: 0xFFFFFF, dark: 0x1C1C1E, lightAlpha: 0.18, darkAlpha: 0.24)
    static let glassFloatingTint = dynamic(light: 0xFFFFFF, dark: 0xEDEDED, lightAlpha: 0.12, darkAlpha: 0.07)
    static let separator = dynamic(light: 0x000000, dark: 0xFFFFFF, lightAlpha: 0.12, darkAlpha: 0.12)

    private static func dynamic(light: UInt, dark: UInt, lightAlpha: Double = 1, darkAlpha: Double = 1) -> Color {
        Color(
            UIColor { traits in
                let hex = traits.userInterfaceStyle == .dark ? dark : light
                let alpha = traits.userInterfaceStyle == .dark ? darkAlpha : lightAlpha
                return UIColor(hex: hex, alpha: alpha)
            }
        )
    }
}

enum MESCFont {
    static let screenTitle = Font.system(.largeTitle, design: .serif).weight(.bold)
    static let titleSerif = Font.system(.title, design: .serif).weight(.bold)
    static let title2 = Font.system(.title2, design: .serif).weight(.bold)
    static let cardTitle = Font.headline
    static let body = Font.body
    static let callout = Font.callout
    static let subheadline = Font.subheadline
    static let caption = Font.caption
    static let caption2 = Font.caption2
}

extension Color {
    init(hex: UInt, alpha: Double = 1) {
        self.init(
            .sRGB,
            red: Double((hex >> 16) & 0xff) / 255,
            green: Double((hex >> 8) & 0xff) / 255,
            blue: Double(hex & 0xff) / 255,
            opacity: alpha
        )
    }
}

extension String {
    var mescPlainText: String {
        guard contains("<") || contains("&") else { return self }

        if let data = data(using: .utf8),
           let attributed = try? NSAttributedString(
            data: data,
            options: [
                .documentType: NSAttributedString.DocumentType.html,
                .characterEncoding: String.Encoding.utf8.rawValue,
            ],
            documentAttributes: nil
           ) {
            return attributed.string.trimmingCharacters(in: .whitespacesAndNewlines)
        }

        return replacingOccurrences(of: "<[^>]+>", with: " ", options: .regularExpression)
            .replacingOccurrences(of: "&nbsp;", with: " ")
            .replacingOccurrences(of: "&amp;", with: "&")
            .replacingOccurrences(of: "&quot;", with: "\"")
            .replacingOccurrences(of: "&#39;", with: "'")
            .components(separatedBy: .whitespacesAndNewlines)
            .filter { !$0.isEmpty }
            .joined(separator: " ")
            .trimmingCharacters(in: .whitespacesAndNewlines)
    }
}

extension Collection {
    subscript(safe index: Index) -> Element? {
        indices.contains(index) ? self[index] : nil
    }
}

extension UIColor {
    convenience init(hex: UInt, alpha: Double = 1) {
        self.init(
            red: CGFloat((hex >> 16) & 0xff) / 255,
            green: CGFloat((hex >> 8) & 0xff) / 255,
            blue: CGFloat(hex & 0xff) / 255,
            alpha: alpha
        )
    }
}

enum MESCMobileAPIError: LocalizedError {
    case invalidBaseURL
    case unauthenticated
    case server(status: Int, message: String)
    case decoding(Error)
    case transport(Error)

    var errorDescription: String? {
        switch self {
        case .invalidBaseURL:
            return "Configuração da API inválida."
        case .unauthenticated:
            return "Sessão expirada. Entre novamente."
        case let .server(_, message):
            return message
        case .decoding:
            return "A API respondeu em um formato inesperado."
        case .transport:
            return "Não foi possível conectar ao servidor."
        }
    }
}

struct MobileErrorBodyDTO: Decodable {
    let message: String?
    let error: String?
    let code: String?
}

struct MobileAuthResponseDTO: Codable {
    let success: Bool
    let auth: MobileAuthDTO
    let user: MobileUserDTO
    let communities: [MobileCommunityDTO]
    let activeCommunityId: String
    let device: MobileDeviceDTO?
}

struct MobileAuthDTO: Codable {
    let tokenType: String
    let accessToken: String
    let refreshToken: String?
    let refreshTokenExpiresAt: String?
    let sessionToken: String?
    let expiresInSeconds: Int?
    let keepSignedIn: Bool
}

struct MobileUserDTO: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let role: String
    let homeCommunityId: String
    let requiresPasswordChange: Bool
    let photoUrl: String?
}

struct MobileCommunityDTO: Codable, Identifiable {
    let id: String
    let name: String
    let slug: String?
    let colorHex: String?
    let parishName: String?
    let isMatriz: Bool?
}

struct MobileDeviceDTO: Codable {
    let id: String?
    let deviceId: String?
    let platform: String?
    let appVersion: String?
    let pushEnabled: Bool?
    let pushProvider: String?
    let notificationPreferences: [String: JSONValue]?
    let biometricCapable: Bool?
    let biometricEnabled: Bool?
    let registered: Bool?
    let lastSeenAt: String?
}

enum JSONValue: Codable, Equatable {
    case string(String)
    case bool(Bool)
    case number(Double)
    case array([JSONValue])
    case object([String: JSONValue])
    case null

    init(from decoder: Decoder) throws {
        let container = try decoder.singleValueContainer()
        if container.decodeNil() {
            self = .null
        } else if let value = try? container.decode(Bool.self) {
            self = .bool(value)
        } else if let value = try? container.decode(Double.self) {
            self = .number(value)
        } else if let value = try? container.decode(String.self) {
            self = .string(value)
        } else if let value = try? container.decode([JSONValue].self) {
            self = .array(value)
        } else if let value = try? container.decode([String: JSONValue].self) {
            self = .object(value)
        } else {
            self = .null
        }
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.singleValueContainer()
        switch self {
        case let .string(value):
            try container.encode(value)
        case let .bool(value):
            try container.encode(value)
        case let .number(value):
            try container.encode(value)
        case let .array(value):
            try container.encode(value)
        case let .object(value):
            try container.encode(value)
        case .null:
            try container.encodeNil()
        }
    }
}

private extension JSONValue {
    var stringValue: String? {
        guard case let .string(value) = self else { return nil }
        return value
    }

    var boolValue: Bool? {
        guard case let .bool(value) = self else { return nil }
        return value
    }

    var arrayValue: [JSONValue]? {
        guard case let .array(value) = self else { return nil }
        return value
    }

    var objectValue: [String: JSONValue]? {
        guard case let .object(value) = self else { return nil }
        return value
    }
}

struct MobileMissionHomeDTO: Codable {
    let success: Bool
    let user: MobileUserDTO
    let community: MobileCommunityDTO
    let nextMission: MobileMissionScheduleDTO?
    let pendingActions: [MobilePendingActionDTO]
    let monthlySummary: MobileMonthlySummaryDTO
    let notices: [MobileNoticeDTO]
    let sync: MobileSyncDTO
}

struct MobileMissionScheduleDTO: Codable {
    let id: String
    let date: String?
    let time: String
    let type: String
    let location: String?
    let position: Int?
    let status: String
    let notes: String?
    let confirmationStatus: String?
    let canConfirm: Bool?
    let canRequestSubstitution: Bool?
    let deepLink: String
}

struct MobilePendingActionDTO: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    let subtitle: String?
    let priority: String
    let deepLink: String
    let dueAt: String?
}

struct MobileMonthlySummaryDTO: Codable {
    let month: String
    let publishedAssignments: Int
    let nextScheduleId: String?
}

struct MobileNoticeDTO: Codable, Identifiable {
    let id: String
    let type: String
    let eventKey: String?
    let title: String
    let message: String
    let priority: String?
    let read: Bool
    let deepLink: String
    let createdAt: String?
}

struct MobileNotificationDTO: Codable, Identifiable {
    let id: String
    let type: String
    let eventKey: String?
    let title: String
    let message: String
    let priority: String?
    let read: Bool
    let readAt: String?
    let deepLink: String
    let createdAt: String?

    func withRead(read: Bool, readAt: String?) -> MobileNotificationDTO {
        MobileNotificationDTO(
            id: id,
            type: type,
            eventKey: eventKey,
            title: title,
            message: message,
            priority: priority,
            read: read,
            readAt: readAt,
            deepLink: deepLink,
            createdAt: createdAt
        )
    }
}

struct MobileNotificationsResponseDTO: Codable {
    let success: Bool
    let notifications: [MobileNotificationDTO]
    let unreadCount: Int
}

struct MobileNotificationReadDTO: Codable {
    let id: String
    let read: Bool
    let readAt: String?
}

struct MobileNotificationReadResponseDTO: Codable {
    let success: Bool
    let notification: MobileNotificationReadDTO
}

struct MobileNotificationReadAllResponseDTO: Codable {
    let success: Bool
}

struct MobileSyncDTO: Codable {
    let serverTime: String
    let cacheMaxAgeSeconds: Int
}

struct MobileScheduleMonthDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let month: String
    let schedules: [MobileMissionScheduleDTO]
    let publicSchedule: MobilePublicScheduleMonthDTO
}

struct MobilePublicScheduleMonthDTO: Codable {
    let assignments: [MobilePublicScheduleAssignmentDTO]
    let exportFormats: [String]
}

struct MobilePublicScheduleAssignmentDTO: Codable, Identifiable {
    let id: String
    let scheduleId: String
    let date: String
    let time: String
    let type: String
    let location: String?
    let position: Int
    let status: String
    let notes: String?
    let ministerId: String?
    let ministerName: String?
    let scheduleDisplayName: String?
    let source: String
    let isCurrentUser: Bool
    let canEditMass: Bool?
}

struct MobileScheduleEditorAssignmentDTO: Codable, Identifiable {
    let id: String
    let scheduleId: String
    let position: Int
    let ministerId: String?
    let ministerName: String?
    let scheduleDisplayName: String?
}

struct MobileScheduleEditorMinisterDTO: Codable, Identifiable {
    let id: String
    let name: String
    let displayName: String
}

struct MobileScheduleEditorMassDTO: Codable {
    let date: String
    let time: String
    let type: String
    let location: String?
    let assignments: [MobileScheduleEditorAssignmentDTO]
}

struct MobileScheduleEditorDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let mass: MobileScheduleEditorMassDTO
    let ministers: [MobileScheduleEditorMinisterDTO]
}

struct MobileScheduleAssignmentUpdateResponseDTO: Codable {
    let success: Bool
    let assignment: MobileScheduleEditorAssignmentDTO
}

struct MobileQuestionnaireCurrentDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let month: String
    let questionnaire: MobileQuestionnaireDTO?
}

struct MobileQuestionnaireDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let month: Int
    let year: Int
    let status: String
    let questions: [MobileQuestionnaireQuestionDTO]
    let deadline: String?
    let responseStatus: String
    let familyMembers: [MobileQuestionnaireFamilyMemberDTO]
    let response: MobileQuestionnaireExistingResponseDTO?

    enum CodingKeys: String, CodingKey {
        case id
        case title
        case description
        case month
        case year
        case status
        case questions
        case deadline
        case responseStatus
        case familyMembers
        case response
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        title = try container.decode(String.self, forKey: .title)
        description = try container.decodeIfPresent(String.self, forKey: .description)
        month = try container.decode(Int.self, forKey: .month)
        year = try container.decode(Int.self, forKey: .year)
        status = try container.decode(String.self, forKey: .status)
        questions = (try? container.decode([MobileQuestionnaireQuestionDTO].self, forKey: .questions)) ?? []
        deadline = try container.decodeIfPresent(String.self, forKey: .deadline)
        responseStatus = try container.decode(String.self, forKey: .responseStatus)
        familyMembers = try container.decodeIfPresent([MobileQuestionnaireFamilyMemberDTO].self, forKey: .familyMembers) ?? []
        response = try container.decodeIfPresent(MobileQuestionnaireExistingResponseDTO.self, forKey: .response)
    }
}

struct MobileQuestionnaireFamilyMemberDTO: Codable, Identifiable {
    let id: String
    let displayName: String
}

struct MobileQuestionnaireQuestionDTO: Codable, Identifiable {
    let id: String
    let type: String
    let title: String
    let options: [String]?
    let required: Bool?
    let metadata: JSONValue?

    enum CodingKeys: String, CodingKey {
        case id
        case type
        case title
        case question
        case options
        case required
        case metadata
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        type = try container.decodeIfPresent(String.self, forKey: .type) ?? "multiple_choice"
        title = try container.decodeIfPresent(String.self, forKey: .title)
            ?? container.decodeIfPresent(String.self, forKey: .question)
            ?? "Pergunta"
        options = try container.decodeIfPresent([String].self, forKey: .options)
        required = try container.decodeIfPresent(Bool.self, forKey: .required)
        metadata = try container.decodeIfPresent(JSONValue.self, forKey: .metadata)
    }

    func encode(to encoder: Encoder) throws {
        var container = encoder.container(keyedBy: CodingKeys.self)
        try container.encode(id, forKey: .id)
        try container.encode(type, forKey: .type)
        try container.encode(title, forKey: .title)
        try container.encodeIfPresent(options, forKey: .options)
        try container.encodeIfPresent(required, forKey: .required)
        try container.encodeIfPresent(metadata, forKey: .metadata)
    }
}

struct MobileQuestionnaireExistingResponseDTO: Codable {
    let id: String
    let responses: JSONValue?
    let answers: [MobileQuestionnaireAnswerDTO]
    let sharedWithFamilyIds: [String]
    let submittedAt: String?
    let updatedAt: String?

    enum CodingKeys: String, CodingKey {
        case id
        case responses
        case answers
        case sharedWithFamilyIds
        case submittedAt
        case updatedAt
    }

    init(from decoder: Decoder) throws {
        let container = try decoder.container(keyedBy: CodingKeys.self)
        id = try container.decode(String.self, forKey: .id)
        responses = try container.decodeIfPresent(JSONValue.self, forKey: .responses)
        answers = try container.decodeIfPresent([MobileQuestionnaireAnswerDTO].self, forKey: .answers) ?? []
        sharedWithFamilyIds = try container.decodeIfPresent([String].self, forKey: .sharedWithFamilyIds) ?? []
        submittedAt = try container.decodeIfPresent(String.self, forKey: .submittedAt)
        updatedAt = try container.decodeIfPresent(String.self, forKey: .updatedAt)
    }
}

struct MobileQuestionnaireAnswerDTO: Codable, Equatable {
    let questionId: String
    let answer: JSONValue
    let metadata: JSONValue?

    init(questionId: String, answer: JSONValue, metadata: JSONValue? = nil) {
        self.questionId = questionId
        self.answer = answer
        self.metadata = metadata
    }
}

struct MobileQuestionnaireSubmitResponseDTO: Codable {
    let success: Bool
    let response: MobileQuestionnaireSavedResponseDTO
}

struct MobileScheduleConfirmResponseDTO: Codable {
    let success: Bool
}

struct MobileSubstitutionCreateResponseDTO: Codable {
    let success: Bool
}

struct MobileSubstitutionUserDTO: Codable, Identifiable {
    let id: String
    let name: String
    let email: String
    let photoUrl: String?
}

struct MobileSubstitutionScheduleDTO: Codable, Identifiable {
    let id: String
    let date: String
    let time: String
    let type: String
    let location: String?
    let deepLink: String
}

struct MobileSubstitutionDTO: Codable, Identifiable {
    let id: String
    let scheduleId: String
    let requesterId: String
    let substituteId: String?
    let status: String
    let reason: String?
    let urgency: String
    let responseMessage: String?
    let schedule: MobileSubstitutionScheduleDTO
    let requester: MobileSubstitutionUserDTO?
    let substitute: MobileSubstitutionUserDTO?
    let deepLink: String
    let createdAt: String?
    let updatedAt: String?
}

struct MobileSubstitutionsResponseDTO: Codable {
    let success: Bool
    let substitutions: [MobileSubstitutionDTO]
}

struct MobileSubstitutionClaimResponseDTO: Codable {
    let success: Bool
    let substitution: MobileSubstitutionDTO
}

struct MobileProfileResponseDTO: Codable {
    let success: Bool
    let profile: MobileProfileDTO
}

struct MobileProfilePhotoResponseDTO: Codable {
    let success: Bool
    let photoUrl: String?
    let updatedAt: String
}

struct MobileProfileDTO: Codable, Identifiable {
    let id: String
    let email: String
    let name: String
    let phone: String?
    let whatsapp: String?
    let role: String
    let status: String
    let photoUrl: String?
    let homeCommunityId: String
    let scheduleDisplayName: String?
    let ministryStartDate: String?
    let maritalStatus: String?
    let preferredPosition: Int?
    let preferredPositions: [Int]
    let avoidPositions: [Int]
    let preferredTimes: [String]
    let availableForSpecialEvents: Bool
    let extraActivities: [String: JSONValue]
    let requiresPasswordChange: Bool
    let createdAt: String?
    let updatedAt: String?
}

struct MobileDeviceResponseDTO: Codable {
    let success: Bool
    let device: MobileDeviceDTO
}

struct MobileQuestionnaireSavedResponseDTO: Codable {
    let id: String
    let questionnaireId: String
    let submittedAt: String?
    let updatedAt: String?
    let processingWarnings: [JSONValue]?
    let unmappedResponses: [JSONValue]?
}

struct MobileFormationOverviewResponseDTO: Codable {
    let success: Bool
    let overview: MobileFormationOverviewDTO
}

struct MobileFormationCertificatesResponseDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let certificates: [MobileFormationCertificateDTO]
}

struct MobileFormationCertificateDTO: Codable, Identifiable {
    let id: String
    let trackId: String
    let certificateNumber: String
    let trackTitle: String
    let trackCategory: String
    let totalLessons: Int
    let totalHours: Int
    let issuedAt: String
    let validUntil: String?
    let verificationCode: String
}

struct MobileFormationLibraryResponseDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let materials: [MobileFormationMaterialDTO]
}

struct MobileFormationAdminMaterialResponseDTO: Codable {
    let success: Bool
    let material: MobileFormationMaterialDTO
}

struct MobileFormationMaterialDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let type: String
    let category: String?
    let trackId: String?
    let fileName: String
    let fileSize: Int
    let mimeType: String
    let tags: [String]
    let source: String
    let updatedAt: String?
}

struct MobileFormationOverviewDTO: Codable {
    let tracks: [MobileFormationTrackDTO]
    let summary: MobileFormationSummaryDTO
}

struct MobileFormationSummaryDTO: Codable {
    let totalTracks: Int
    let totalModules: Int
    let totalLessons: Int
    let completedLessons: Int
    let inProgressLessons: Int
    let percentageCompleted: Int
    let lastUpdated: String?
}

struct MobileFormationTrackDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let category: String?
    let modules: [MobileFormationModuleDTO]
    let stats: MobileFormationTrackStatsDTO
    let nextLesson: MobileFormationLessonDTO?
}

struct MobileFormationTrackStatsDTO: Codable {
    let totalModules: Int
    let totalLessons: Int
    let completedLessons: Int
    let inProgressLessons: Int
    let progressPercentage: Int
}

struct MobileFormationModuleDTO: Codable, Identifiable {
    let id: String
    let trackId: String?
    let title: String
    let description: String?
    let durationMinutes: Int?
    let videoUrl: String?
    let lessons: [MobileFormationLessonDTO]
    let stats: MobileFormationModuleStatsDTO
}

struct MobileFormationModuleStatsDTO: Codable {
    let totalLessons: Int
    let completedLessons: Int
    let inProgressLessons: Int
    let progressPercentage: Int
}

struct MobileFormationLessonDTO: Codable, Identifiable {
    let id: String
    let moduleId: String
    let trackId: String?
    let title: String
    let description: String?
    let lessonNumber: Int
    let estimatedDuration: Int?
    let videoUrl: String?
    let progress: MobileFormationProgressDTO?
}

struct MobileFormationLessonDetailDTO: Codable, Identifiable {
    let success: Bool
    let lesson: MobileFormationLessonDetailInfoDTO
    let sections: [MobileFormationLessonSectionDTO]
    let progress: MobileFormationProgressDTO

    var id: String { lesson.id }

    func withProgress(_ newProgress: MobileFormationProgressDTO) -> MobileFormationLessonDetailDTO {
        MobileFormationLessonDetailDTO(
            success: success,
            lesson: lesson,
            sections: sections,
            progress: newProgress
        )
    }
}

struct MobileFormationLessonDetailInfoDTO: Codable, Identifiable {
    let id: String
    let moduleId: String
    let trackId: String?
    let title: String
    let description: String?
    let lessonNumber: Int
    let estimatedDuration: Int?
    let contentType: String?
    let contentUrl: String?
    let videoUrl: String?
    let documentUrl: String?
}

struct MobileFormationLessonSectionDTO: Codable, Identifiable {
    let id: String
    let title: String
    let content: String?
    let contentType: String?
    let orderIndex: Int
    let videoUrl: String?
    let audioUrl: String?
    let documentUrl: String?
    let estimatedMinutes: Int?
    let quizData: JSONValue?
    let interactiveData: JSONValue?
}

struct MobileFormationProgressDTO: Codable {
    let status: String
    let progressPercentage: Int
    let timeSpent: Int?
    let completedSections: [String]?
}

struct MobileFormationLessonCompleteResponseDTO: Codable {
    let success: Bool
    let progress: MobileFormationProgressDTO
    let certificate: MobileFormationCertificateDTO?
}

struct MobileFormationAdminStudioResponseDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let studio: MobileFormationAdminStudioDTO
}

struct MobileFormationAdminStudioDTO: Codable {
    let tracks: [MobileFormationAdminTrackDTO]
    let summary: MobileFormationAdminSummaryDTO
}

struct MobileFormationAdminSummaryDTO: Codable {
    let totalTracks: Int
    let totalModules: Int
    let totalLessons: Int
    let activeLessons: Int
    let videoLessons: Int
    let lastUpdated: String?
}

struct MobileFormationAdminTrackDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let category: String?
    let orderIndex: Int
    let icon: String?
    let isActive: Bool
    let modules: [MobileFormationAdminModuleDTO]
}

struct MobileFormationAdminModuleDTO: Codable, Identifiable {
    let id: String
    let trackId: String
    let title: String
    let description: String?
    let orderIndex: Int
    let durationMinutes: Int?
    let videoUrl: String?
    let lessons: [MobileFormationAdminLessonDTO]
}

struct MobileFormationAdminLessonDTO: Codable, Identifiable {
    let id: String
    let moduleId: String
    let trackId: String?
    let isEditable: Bool?
    let title: String
    let description: String?
    let orderIndex: Int
    let lessonNumber: Int
    let estimatedDuration: Int?
    let isActive: Bool
    let videoUrl: String?
    let documentUrl: String?
    let sectionsCount: Int
    let updatedAt: String?
}

struct MobileFormationAdminLessonResponseDTO: Codable {
    let success: Bool
    let lesson: MobileFormationAdminLessonDTO
    let sections: [MobileFormationLessonSectionDTO]
}

struct MobileCoordinatorDataQualityDTO: Codable {
    let status: String
    let score: Int?
}

struct MobileCoordinatorCommunityMetricsDTO: Codable {
    let activeMinisters: Int
    let publishedAssignments: Int
    let pendingSubstitutions: Int
    let questionnaireResponses: Int
    let questionnairePending: Int?
    let questionnaireTarget: Int?
    let profileReady: Int
    let profileNeedsAttention: Int
    let profileBlocked: Int
}

struct MobileCoordinatorQuestionnaireSummaryDTO: Codable, Identifiable {
    let id: String
    let title: String
    let month: Int
    let year: Int
    let status: String
    let responses: Int
    let pending: Int
    let target: Int
    let responseRate: Int
    let deepLink: String
}

struct MobileCoordinatorCoverageDTO: Codable, Identifiable {
    var id: String { "\(date)|\(time)|\(type)|\(location ?? "")" }
    let date: String
    let time: String
    let type: String
    let location: String?
    let assigned: Int
    let vacancies: Int
    let scheduleIds: [String]
    let status: String
}

struct MobileCoordinatorCommunityHomeDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let month: String
    let metrics: MobileCoordinatorCommunityMetricsDTO
    let questionnaire: MobileCoordinatorQuestionnaireSummaryDTO?
    let coverage: [MobileCoordinatorCoverageDTO]
    let substitutions: [MobileSubstitutionDTO]
}

struct MobileCoordinatorScheduleReadinessStateDTO: Codable {
    let canPreview: Bool
    let canPublish: Bool
    let blockers: [String]
    let publishBlockers: [String]
    let warnings: [String]
}

struct MobileCoordinatorReadinessMinistersDTO: Codable {
    let active: Int
    let ready: Int
    let needsAttention: Int
    let blocked: Int
}

struct MobileCoordinatorReadinessQuestionnaireDTO: Codable {
    let id: String
    let title: String
    let month: Int
    let year: Int
    let status: String
    let deadline: String?
    let targetCount: Int
    let responseCount: Int
    let pendingCount: Int
    let responseRate: Int
}

struct MobileCoordinatorMassConfigDTO: Codable {
    let configuredSlots: Int
}

struct MobileCoordinatorExistingSchedulesDTO: Codable {
    let total: Int
    let draft: Int
    let scheduled: Int
    let published: Int
    let completed: Int
}

struct MobileCoordinatorScheduleReadinessDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let month: String
    let readiness: MobileCoordinatorScheduleReadinessStateDTO
    let ministers: MobileCoordinatorReadinessMinistersDTO
    let questionnaire: MobileCoordinatorReadinessQuestionnaireDTO?
    let massConfig: MobileCoordinatorMassConfigDTO
    let existingSchedules: MobileCoordinatorExistingSchedulesDTO
}

struct MobileCoordinatorMinisterDTO: Codable, Identifiable {
    let id: String
    let name: String
    let displayName: String
    let role: String
    let status: String
    let phone: String?
    let whatsapp: String?
    let preferredPosition: Int?
    let preferredPositions: [Int]
    let preferredTimes: [String]
    let dataQuality: MobileCoordinatorDataQualityDTO
}

struct MobileCoordinatorMinistersResponseDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let ministers: [MobileCoordinatorMinisterDTO]
}

struct MobileDirectoryMinisterDTO: Codable, Identifiable {
    let id: String
    let displayName: String
    let role: String
    let photoAvailable: Bool
}

struct MobileDirectoryMinistersResponseDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let ministers: [MobileDirectoryMinisterDTO]
}

struct MobileCoordinatorQuestionnaireTargetDTO: Codable, Identifiable {
    let id: String
    let name: String
    let displayName: String
    let responded: Bool
    let respondedAt: String?
    let availability: String?
    let dataQuality: MobileCoordinatorDataQualityDTO
}

struct MobileCoordinatorQuestionnaireResponseSummaryDTO: Codable {
    let targetCount: Int
    let respondedCount: Int
    let pendingCount: Int
    let responseRate: Int
}

struct MobileCoordinatorQuestionnaireResponsesQuestionnaireDTO: Codable {
    let id: String
    let title: String
    let month: Int
    let year: Int
    let status: String
    let deadline: String?
}

struct MobileCoordinatorQuestionnaireResponsesDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let questionnaire: MobileCoordinatorQuestionnaireResponsesQuestionnaireDTO
    let summary: MobileCoordinatorQuestionnaireResponseSummaryDTO
    let ministers: [MobileCoordinatorQuestionnaireTargetDTO]
}

struct MobileCoordinatorQuestionnaireLifecycleDTO: Codable, Identifiable {
    let id: String
    let title: String
    let description: String?
    let month: Int
    let year: Int
    let status: String
    let deadline: String?
    let questionCount: Int
    let targetCount: Int
    let responseCount: Int
    let pendingCount: Int
    let responseRate: Int
}

struct MobileCoordinatorQuestionnaireLifecycleResponseDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let questionnaire: MobileCoordinatorQuestionnaireLifecycleDTO
    let notificationsQueued: Int?
}

struct MobileCoordinatorSchedulePreviewSummaryDTO: Codable {
    let totalMasses: Int
    let totalAssignments: Int
    let totalVacancies: Int
    let averageConfidence: Double
    let lowConfidenceMasses: Int
}

struct MobileCoordinatorSchedulePreviewItemDTO: Codable, Identifiable {
    var id: String { "\(date ?? "")|\(time)|\(displayName)|\(location ?? "")" }
    let date: String?
    let time: String
    let type: String
    let displayName: String
    let location: String?
    let requiredMinisters: Int
    let assignedMinisters: Int
    let vacancies: Int
    let confidence: Double
    let status: String
}

struct MobileCoordinatorSchedulePreviewDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let month: String
    let generatedAt: String
    let summary: MobileCoordinatorSchedulePreviewSummaryDTO
    let schedules: [MobileCoordinatorSchedulePreviewItemDTO]
}

struct MobileCoordinatorSchedulePublishSummaryDTO: Codable {
    let totalMasses: Int
    let totalAssignments: Int
    let totalVacancies: Int
    let averageConfidence: Double
    let lowConfidenceMasses: Int
    let publishedAssignments: Int
    let notificationsQueued: Int
    let replacedSchedules: Int
}

struct MobileCoordinatorSchedulePublishDTO: Codable {
    let success: Bool
    let community: MobileCommunityDTO
    let month: String
    let publishedAt: String
    let summary: MobileCoordinatorSchedulePublishSummaryDTO
    let schedules: [MobileCoordinatorSchedulePreviewItemDTO]

    var asPreview: MobileCoordinatorSchedulePreviewDTO {
        MobileCoordinatorSchedulePreviewDTO(
            success: success,
            community: community,
            month: month,
            generatedAt: publishedAt,
            summary: MobileCoordinatorSchedulePreviewSummaryDTO(
                totalMasses: summary.totalMasses,
                totalAssignments: summary.totalAssignments,
                totalVacancies: summary.totalVacancies,
                averageConfidence: summary.averageConfidence,
                lowConfidenceMasses: summary.lowConfidenceMasses
            ),
            schedules: schedules
        )
    }
}

final class MESCMobileAPIClient {
    private let baseURL: URL
    private let decoder: JSONDecoder
    private let encoder: JSONEncoder

    init() {
        let value = Bundle.main.object(forInfoDictionaryKey: "MESCAPIBaseURL") as? String
        self.baseURL = URL(string: value ?? "") ?? URL(string: "https://saojudastadeu.app/api/mobile/v1")!
        self.decoder = JSONDecoder()
        self.encoder = JSONEncoder()
    }

    func login(
        email: String,
        password: String,
        keepSignedIn: Bool,
        deviceId: String,
        appVersion: String?
    ) async throws -> MobileAuthResponseDTO {
        try await post(
            "auth/login",
            body: LoginRequestBody(
                email: email,
                password: password,
                keepSignedIn: keepSignedIn,
                deviceId: deviceId,
                platform: "ios",
                appVersion: appVersion
            )
        )
    }

    func refresh(refreshToken: String, deviceId: String) async throws -> MobileAuthResponseDTO {
        try await post(
            "auth/refresh",
            body: RefreshRequestBody(refreshToken: refreshToken, deviceId: deviceId)
        )
    }

    func missionHome(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        month: String
    ) async throws -> MobileMissionHomeDTO {
        try await get(
            "mission/home",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "month", value: month)]
        )
    }

    func scheduleMonth(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        month: String
    ) async throws -> MobileScheduleMonthDTO {
        try await get(
            "schedules/month",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "month", value: month)]
        )
    }

    func scheduleEditor(
        scheduleId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileScheduleEditorDTO {
        try await get(
            "schedules/\(scheduleId)/editor",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func updateScheduleAssignment(
        scheduleId: String,
        ministerId: String?,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileScheduleAssignmentUpdateResponseDTO {
        try await authenticatedPatch(
            "schedules/\(scheduleId)",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: ScheduleAssignmentUpdateRequestBody(ministerId: ministerId)
        )
    }

    func coordinatorCommunityHome(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        month: String
    ) async throws -> MobileCoordinatorCommunityHomeDTO {
        try await get(
            "admin/community/home",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "month", value: month)]
        )
    }

    func coordinatorScheduleReadiness(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        month: String
    ) async throws -> MobileCoordinatorScheduleReadinessDTO {
        try await get(
            "admin/schedules/readiness",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "month", value: month)]
        )
    }

    func coordinatorMinisters(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileCoordinatorMinistersResponseDTO {
        try await get(
            "admin/ministers",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func coordinatorQuestionnaireResponses(
        questionnaireId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileCoordinatorQuestionnaireResponsesDTO {
        try await get(
            "admin/questionnaires/\(questionnaireId)/responses",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func createCoordinatorQuestionnaire(
        month: Int,
        year: Int,
        title: String?,
        description: String?,
        deadline: String?,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileCoordinatorQuestionnaireLifecycleResponseDTO {
        try await authenticatedPost(
            "admin/questionnaires",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: CoordinatorQuestionnaireCreateRequestBody(
                month: month,
                year: year,
                title: title,
                description: description,
                deadline: deadline
            )
        )
    }

    func publishCoordinatorQuestionnaire(
        questionnaireId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileCoordinatorQuestionnaireLifecycleResponseDTO {
        try await authenticatedPost(
            "admin/questionnaires/\(questionnaireId)/publish",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: EmptyRequestBody()
        )
    }

    func closeCoordinatorQuestionnaire(
        questionnaireId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileCoordinatorQuestionnaireLifecycleResponseDTO {
        try await authenticatedPost(
            "admin/questionnaires/\(questionnaireId)/close",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: EmptyRequestBody()
        )
    }

    func coordinatorSchedulePreview(
        month: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileCoordinatorSchedulePreviewDTO {
        try await authenticatedPost(
            "admin/schedules/generate-preview",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: CoordinatorSchedulePreviewRequestBody(month: month)
        )
    }

    func publishCoordinatorSchedule(
        month: String,
        replaceExisting: Bool,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileCoordinatorSchedulePublishDTO {
        try await authenticatedPost(
            "admin/schedules/publish",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: CoordinatorSchedulePublishRequestBody(month: month, replaceExisting: replaceExisting)
        )
    }

    func currentQuestionnaire(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        month: String
    ) async throws -> MobileQuestionnaireCurrentDTO {
        try await get(
            "questionnaires/current",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "month", value: month)]
        )
    }

    func submitQuestionnaire(
        questionnaireId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        responses: [MobileQuestionnaireAnswerDTO],
        sharedWithFamilyIds: [String]
    ) async throws -> MobileQuestionnaireSubmitResponseDTO {
        try await authenticatedPost(
            "questionnaires/\(questionnaireId)/response",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: QuestionnaireSubmitRequestBody(
                responses: responses,
                sharedWithFamilyIds: sharedWithFamilyIds
            )
        )
    }

    func formationOverview(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileFormationOverviewResponseDTO {
        try await get(
            "formation/overview",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func formationCertificates(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileFormationCertificatesResponseDTO {
        try await get(
            "formation/certificates",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func formationLibrary(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileFormationLibraryResponseDTO {
        try await get(
            "formation/library",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func formationCertificatePDF(
        certificateId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> Data {
        var request = try makeRequest(path: "formation/certificates/\(certificateId)/pdf")
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await sendData(request)
    }

    func formationMaterialDownload(
        materialId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> Data {
        var request = try makeRequest(path: "formation/library/\(materialId)/download")
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await sendData(request)
    }

    func formationLesson(
        trackId: String,
        moduleId: String,
        lessonNumber: Int,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileFormationLessonDetailDTO {
        try await get(
            "formation/\(trackId)/\(moduleId)/\(lessonNumber)",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func completeFormationLesson(
        lessonId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationLessonCompleteResponseDTO {
        try await authenticatedPost(
            "formation/lessons/\(lessonId)/complete",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: EmptyRequestBody()
        )
    }

    func completeFormationLessonSection(
        lessonId: String,
        sectionId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationLessonCompleteResponseDTO {
        try await authenticatedPost(
            "formation/lessons/\(lessonId)/sections/\(sectionId)/complete",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: EmptyRequestBody()
        )
    }

    func formationAdminStudio(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileFormationAdminStudioResponseDTO {
        try await get(
            "formation/admin/studio",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func createFormationAdminLesson(
        payload: FormationAdminLessonRequestBody,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationAdminLessonResponseDTO {
        try await authenticatedPost(
            "formation/admin/lessons",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: payload
        )
    }

    func updateFormationAdminLesson(
        lessonId: String,
        payload: FormationAdminLessonUpdateRequestBody,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationAdminLessonResponseDTO {
        try await authenticatedPatch(
            "formation/admin/lessons/\(lessonId)",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: payload
        )
    }

    func createFormationAdminLessonSection(
        lessonId: String,
        payload: FormationAdminSectionRequestBody,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationAdminLessonResponseDTO {
        try await authenticatedPost(
            "formation/admin/lessons/\(lessonId)/sections",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: payload
        )
    }

    func createFormationAdminMaterial(
        payload: FormationAdminMaterialRequestBody,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileFormationAdminMaterialResponseDTO {
        try await authenticatedPost(
            "formation/admin/materials",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: payload
        )
    }

    func confirmSchedule(
        scheduleId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        status: String,
        notes: String?
    ) async throws -> MobileScheduleConfirmResponseDTO {
        try await authenticatedPost(
            "schedules/\(scheduleId)/confirm",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: ScheduleConfirmRequestBody(status: status, notes: notes)
        )
    }

    func requestSubstitution(
        scheduleId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        reason: String?
    ) async throws -> MobileSubstitutionCreateResponseDTO {
        try await authenticatedPost(
            "substitutions",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: SubstitutionCreateRequestBody(scheduleId: scheduleId, reason: reason)
        )
    }

    func substitutions(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileSubstitutionsResponseDTO {
        try await get(
            "substitutions",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func claimSubstitution(
        substitutionId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        message: String?
    ) async throws -> MobileSubstitutionClaimResponseDTO {
        try await authenticatedPost(
            "substitutions/\(substitutionId)/claim",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: SubstitutionClaimRequestBody(message: message)
        )
    }

    func profile(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileProfileResponseDTO {
        try await get(
            "profile",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func updateProfile(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        body: ProfileUpdateRequestBody
    ) async throws -> MobileProfileResponseDTO {
        try await authenticatedPatch(
            "profile",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: body
        )
    }

    func profilePhoto(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> Data {
        var request = try makeRequest(path: "profile/photo")
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await sendData(request)
    }

    func directoryMinisters(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileDirectoryMinistersResponseDTO {
        try await get(
            "directory/ministers",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func directoryMinisterPhoto(
        ministerId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> Data {
        var request = try makeRequest(path: "directory/ministers/\(ministerId)/photo")
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await sendData(request)
    }

    func uploadProfilePhoto(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        imageBase64: String,
        contentType: String
    ) async throws -> MobileProfilePhotoResponseDTO {
        try await authenticatedPost(
            "profile/photo",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: ProfilePhotoUploadRequestBody(imageBase64: imageBase64, contentType: contentType)
        )
    }

    func removeProfilePhoto(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String
    ) async throws -> MobileProfilePhotoResponseDTO {
        try await authenticatedDelete(
            "profile/photo",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            idempotencyKey: idempotencyKey,
            body: EmptyRequestBody()
        )
    }

    func currentDevice(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileDeviceResponseDTO {
        try await get(
            "devices/current",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func notifications(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        limit: Int
    ) async throws -> MobileNotificationsResponseDTO {
        try await get(
            "notifications",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            queryItems: [URLQueryItem(name: "limit", value: String(limit))]
        )
    }

    func markNotificationRead(
        notificationId: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileNotificationReadResponseDTO {
        try await authenticatedPatch(
            "notifications/\(notificationId)/read",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func markAllNotificationsRead(
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> MobileNotificationReadAllResponseDTO {
        try await authenticatedPatch(
            "notifications/read-all",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId
        )
    }

    func updateCurrentDevice(
        accessToken: String,
        communityId: String?,
        deviceId: String,
        appVersion: String?,
        pushToken: String?,
        pushProvider: String?,
        pushEnabled: Bool?,
        biometricCapable: Bool?,
        biometricEnabled: Bool?,
        notificationPreferences: [String: Bool]?
    ) async throws -> MobileDeviceResponseDTO {
        try await authenticatedPut(
            "devices/current",
            accessToken: accessToken,
            communityId: communityId,
            deviceId: deviceId,
            body: DeviceUpdateRequestBody(
                deviceId: deviceId,
                platform: "ios",
                appVersion: appVersion,
                pushToken: pushToken,
                pushProvider: pushProvider,
                pushEnabled: pushEnabled,
                biometricCapable: biometricCapable,
                biometricEnabled: biometricEnabled,
                notificationPreferences: notificationPreferences
            )
        )
    }

    static func userMessage(for error: Error) -> String {
        if let apiError = error as? MESCMobileAPIError {
            return apiError.localizedDescription
        }

        return "Não foi possível concluir a operação."
    }

    private func get<Response: Decodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        queryItems: [URLQueryItem] = []
    ) async throws -> Response {
        var request = try makeRequest(path: path, queryItems: queryItems)
        request.httpMethod = "GET"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await send(request)
    }

    private func post<Response: Decodable, Body: Encodable>(_ path: String, body: Body) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func authenticatedPost<Response: Decodable, Body: Encodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        body: Body
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "POST"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func authenticatedPut<Response: Decodable, Body: Encodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        body: Body
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "PUT"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func authenticatedPatch<Response: Decodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "PATCH"
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        return try await send(request)
    }

    private func authenticatedPatch<Response: Decodable, Body: Encodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        body: Body
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "PATCH"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func authenticatedDelete<Response: Decodable, Body: Encodable>(
        _ path: String,
        accessToken: String,
        communityId: String?,
        deviceId: String,
        idempotencyKey: String,
        body: Body
    ) async throws -> Response {
        var request = try makeRequest(path: path)
        request.httpMethod = "DELETE"
        request.setValue("application/json", forHTTPHeaderField: "Content-Type")
        request.setValue("Bearer \(accessToken)", forHTTPHeaderField: "Authorization")
        request.setValue(deviceId, forHTTPHeaderField: "X-Device-Id")
        request.setValue(idempotencyKey, forHTTPHeaderField: "Idempotency-Key")
        if let communityId {
            request.setValue(communityId, forHTTPHeaderField: "X-Community-Id")
        }
        request.httpBody = try encoder.encode(body)
        return try await send(request)
    }

    private func makeRequest(path: String, queryItems: [URLQueryItem] = []) throws -> URLRequest {
        let url = baseURL.appendingPathComponent(path)
        guard var components = URLComponents(url: url, resolvingAgainstBaseURL: false) else {
            throw MESCMobileAPIError.invalidBaseURL
        }

        if !queryItems.isEmpty {
            components.queryItems = queryItems
        }

        guard let finalURL = components.url else {
            throw MESCMobileAPIError.invalidBaseURL
        }

        var request = URLRequest(url: finalURL)
        request.timeoutInterval = 20
        request.setValue("application/json", forHTTPHeaderField: "Accept")
        request.setValue("MESCNative-iOS", forHTTPHeaderField: "User-Agent")
        return request
    }

    private func send<Response: Decodable>(_ request: URLRequest) async throws -> Response {
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw MESCMobileAPIError.transport(URLError(.badServerResponse))
            }

            guard (200..<300).contains(http.statusCode) else {
                let message = (try? decoder.decode(MobileErrorBodyDTO.self, from: data).message)
                    ?? (try? decoder.decode(MobileErrorBodyDTO.self, from: data).error)
                    ?? "Erro \(http.statusCode) na API mobile."
                throw MESCMobileAPIError.server(status: http.statusCode, message: message)
            }

            do {
                return try decoder.decode(Response.self, from: data)
            } catch {
                throw MESCMobileAPIError.decoding(error)
            }
        } catch let error as MESCMobileAPIError {
            throw error
        } catch {
            throw MESCMobileAPIError.transport(error)
        }
    }

    private func sendData(_ request: URLRequest) async throws -> Data {
        do {
            let (data, response) = try await URLSession.shared.data(for: request)
            guard let http = response as? HTTPURLResponse else {
                throw MESCMobileAPIError.transport(URLError(.badServerResponse))
            }

            guard (200..<300).contains(http.statusCode) else {
                let message = (try? decoder.decode(MobileErrorBodyDTO.self, from: data).message)
                    ?? (try? decoder.decode(MobileErrorBodyDTO.self, from: data).error)
                    ?? "Erro \(http.statusCode) na API mobile."
                throw MESCMobileAPIError.server(status: http.statusCode, message: message)
            }

            return data
        } catch let error as MESCMobileAPIError {
            throw error
        } catch {
            throw MESCMobileAPIError.transport(error)
        }
    }
}

private struct LoginRequestBody: Encodable {
    let email: String
    let password: String
    let keepSignedIn: Bool
    let deviceId: String
    let platform: String
    let appVersion: String?
}

private struct RefreshRequestBody: Encodable {
    let refreshToken: String
    let deviceId: String
}

private struct QuestionnaireSubmitRequestBody: Encodable {
    let responses: [MobileQuestionnaireAnswerDTO]
    let sharedWithFamilyIds: [String]
}

private struct ScheduleConfirmRequestBody: Encodable {
    let status: String
    let notes: String?
}

private struct ScheduleAssignmentUpdateRequestBody: Encodable {
    let ministerId: String?
}

private struct SubstitutionCreateRequestBody: Encodable {
    let scheduleId: String
    let reason: String?
}

private struct SubstitutionClaimRequestBody: Encodable {
    let message: String?
}

struct ProfileUpdateRequestBody: Encodable {
    let name: String
    let phone: String?
    let whatsapp: String?
    let scheduleDisplayName: String?
    let ministryStartDate: String?
    let maritalStatus: String?
}

struct ProfilePhotoUploadRequestBody: Encodable {
    let imageBase64: String
    let contentType: String
}

struct FormationAdminLessonRequestBody: Encodable {
    let moduleId: String
    let title: String
    let description: String?
    let lessonNumber: Int?
    let durationMinutes: Int?
    let isActive: Bool?
    let sectionTitle: String?
    let sectionContent: String?
    let videoUrl: String?
}

struct FormationAdminLessonUpdateRequestBody: Encodable {
    let title: String?
    let description: String?
    let lessonNumber: Int?
    let durationMinutes: Int?
    let isActive: Bool?
}

struct FormationAdminSectionRequestBody: Encodable {
    let title: String
    let content: String?
    let type: String?
    let videoUrl: String?
    let audioUrl: String?
    let documentUrl: String?
    let estimatedMinutes: Int?
    let isRequired: Bool?
}

struct FormationAdminMaterialRequestBody: Encodable {
    let title: String
    let description: String?
    let type: String
    let category: String?
    let trackId: String?
    let externalUrl: String
    let tags: [String]
    let isPublished: Bool?
}

private struct CoordinatorSchedulePreviewRequestBody: Encodable {
    let month: String
}

private struct CoordinatorSchedulePublishRequestBody: Encodable {
    let month: String
    let replaceExisting: Bool
}

private struct CoordinatorQuestionnaireCreateRequestBody: Encodable {
    let month: Int
    let year: Int
    let title: String?
    let description: String?
    let deadline: String?
}

private struct DeviceUpdateRequestBody: Encodable {
    let deviceId: String
    let platform: String
    let appVersion: String?
    let pushToken: String?
    let pushProvider: String?
    let pushEnabled: Bool?
    let biometricCapable: Bool?
    let biometricEnabled: Bool?
    let notificationPreferences: [String: Bool]?
}

private struct EmptyRequestBody: Encodable {}

final class MESCNativeSessionStore {
    private enum DefaultsKey {
        static let deviceId = "mesc.native.deviceId"
        static let activeCommunityId = "mesc.native.activeCommunityId"
        static let remotePushToken = "mesc.native.remotePushToken"
    }

    private let defaults = UserDefaults.standard

    var deviceId: String {
        if let existing = defaults.string(forKey: DefaultsKey.deviceId), !existing.isEmpty {
            return existing
        }

        let created = UUID().uuidString.lowercased()
        defaults.set(created, forKey: DefaultsKey.deviceId)
        return created
    }

    var activeCommunityId: String? {
        get { defaults.string(forKey: DefaultsKey.activeCommunityId) }
        set {
            if let newValue {
                defaults.set(newValue, forKey: DefaultsKey.activeCommunityId)
            } else {
                defaults.removeObject(forKey: DefaultsKey.activeCommunityId)
            }
        }
    }

    var remotePushToken: String? {
        get { defaults.string(forKey: DefaultsKey.remotePushToken) }
        set {
            if let newValue, !newValue.isEmpty {
                defaults.set(newValue, forKey: DefaultsKey.remotePushToken)
            } else {
                defaults.removeObject(forKey: DefaultsKey.remotePushToken)
            }
        }
    }

    var accessToken: String? {
        get { MESCKeychain.read(key: "accessToken") }
        set { MESCKeychain.write(newValue, key: "accessToken") }
    }

    var refreshToken: String? {
        get { MESCKeychain.read(key: "refreshToken") }
        set { MESCKeychain.write(newValue, key: "refreshToken") }
    }

    func clearTokens() {
        accessToken = nil
        refreshToken = nil
    }
}

enum MESCKeychain {
    // Keep TestFlight's legacy tokens isolated after the native session restoration crash.
    private static let service = "app.saojudastadeu.mesc.native.v2"

    static func read(key: String) -> String? {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecReturnData as String: true,
            kSecMatchLimit as String: kSecMatchLimitOne
        ]

        var item: CFTypeRef?
        guard SecItemCopyMatching(query as CFDictionary, &item) == errSecSuccess,
              let data = item as? Data
        else {
            return nil
        }

        return String(data: data, encoding: .utf8)
    }

    static func write(_ value: String?, key: String) {
        delete(key: key)

        guard let value, let data = value.data(using: .utf8) else {
            return
        }

        let attributes: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key,
            kSecValueData as String: data,
            kSecAttrAccessible as String: kSecAttrAccessibleAfterFirstUnlockThisDeviceOnly
        ]

        SecItemAdd(attributes as CFDictionary, nil)
    }

    static func delete(key: String) {
        let query: [String: Any] = [
            kSecClass as String: kSecClassGenericPassword,
            kSecAttrService as String: service,
            kSecAttrAccount as String: key
        ]

        SecItemDelete(query as CFDictionary)
    }
}

struct ScheduleDay: Identifiable, Equatable {
    let id: Int
    let dayNumber: Int
    let date: Date
    let missions: [ScheduleMission]

    var formattedTitle: String {
        let formatter = DateFormatter()
        formatter.locale = Locale(identifier: "pt_BR")
        formatter.dateFormat = "EEEE, dd 'de' MMMM"
        return formatter.string(from: date).capitalized
    }
}

struct ScheduleMission: Identifiable, Equatable {
    let id: String
    let scheduleId: String?
    let dayNumber: Int
    let time: String
    let title: String
    let community: String
    let role: String
    let ministers: [String]
    let positions: [SchedulePosition]
    let confirmationStatus: String?
    let canConfirm: Bool
    let canRequestSubstitution: Bool
    let isCurrentUser: Bool
    let canEditMass: Bool

    init(
        id: String,
        scheduleId: String?,
        dayNumber: Int,
        time: String,
        title: String,
        community: String,
        role: String,
        ministers: [String],
        confirmationStatus: String?,
        canConfirm: Bool,
        canRequestSubstitution: Bool,
        isCurrentUser: Bool,
        positions: [SchedulePosition] = [],
        canEditMass: Bool = false
    ) {
        self.id = id
        self.scheduleId = scheduleId
        self.dayNumber = dayNumber
        self.time = time
        self.title = title
        self.community = community
        self.role = role
        self.ministers = ministers
        self.confirmationStatus = confirmationStatus
        self.canConfirm = canConfirm
        self.canRequestSubstitution = canRequestSubstitution
        self.isCurrentUser = isCurrentUser
        self.positions = positions
        self.canEditMass = canEditMass
    }
}

struct SchedulePosition: Identifiable, Equatable {
    let id: String
    let scheduleId: String
    let position: Int
    let displayName: String
    let isCurrentUser: Bool
    let isVacant: Bool
    let source: String

    var positionLabel: String {
        MESCNativeAppModel.positionDisplayLabel(position)
    }
}

enum ScheduleFixtures {
    static let monthDate = makeDate(day: 1)

    static let days: [ScheduleDay] = (1...31).map { day in
        ScheduleDay(
            id: day,
            dayNumber: day,
            date: makeDate(day: day),
            missions: missions(for: day)
        )
    }

    private static func makeDate(day: Int) -> Date {
        var components = DateComponents()
        components.year = 2026
        components.month = 7
        components.day = day
        return Calendar.current.date(from: components) ?? Date()
    }

    private static func missions(for day: Int) -> [ScheduleMission] {
        switch day {
        case 5:
            return [
                ScheduleMission(
                    id: "fixture-5-0800",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "08:00",
                    title: "Missa Dominical",
                    community: "Santuário",
                    role: "Posição 1 · Auxiliar 1",
                    ministers: ["Ana Maria", "Carlos Roberto", "Fatima Lima", "Jose Paulo"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                ),
                ScheduleMission(
                    id: "fixture-5-1800",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "18:00",
                    title: "Missa da Noite",
                    community: "Santuário",
                    role: "Reserva",
                    ministers: ["Marina Costa", "Paulo Sergio", "Ana Maria"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                )
            ]
        case 12:
            return [
                ScheduleMission(
                    id: "fixture-12-1000",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "10:00",
                    title: "Missa da Comunidade",
                    community: "São Judas",
                    role: "Posição 2 · Auxiliar 2",
                    ministers: ["Ana Maria", "Lucia Helena", "Roberto Alves"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                )
            ]
        case 19:
            return [
                ScheduleMission(
                    id: "fixture-19-0800",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "08:00",
                    title: "Missa Dominical",
                    community: "Santuário",
                    role: "Posição 1 · Auxiliar 1",
                    ministers: ["Ana Maria", "Beatriz Souza", "Miguel Rocha", "Clara Dias"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                )
            ]
        case 26:
            return [
                ScheduleMission(
                    id: "fixture-26-1930",
                    scheduleId: nil,
                    dayNumber: day,
                    time: "19:30",
                    title: "Missa Votiva",
                    community: "Santuário",
                    role: "Posição 3 · Recolher 1",
                    ministers: ["Ana Maria", "Ricardo Nunes", "Helena Prado"],
                    confirmationStatus: nil,
                    canConfirm: false,
                    canRequestSubstitution: false,
                    isCurrentUser: false
                )
            ]
        default:
            return []
        }
    }
}
