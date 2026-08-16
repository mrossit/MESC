package app.saojudastadeu.mesc

import android.Manifest
import android.content.Context
import android.os.Build
import androidx.activity.compose.rememberLauncherForActivityResult
import androidx.activity.result.contract.ActivityResultContracts
import androidx.biometric.BiometricManager
import androidx.compose.foundation.background
import androidx.compose.foundation.border
import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.Arrangement
import androidx.compose.foundation.layout.Box
import androidx.compose.foundation.layout.Column
import androidx.compose.foundation.layout.ColumnScope
import androidx.compose.foundation.layout.Row
import androidx.compose.foundation.layout.Spacer
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.foundation.layout.fillMaxWidth
import androidx.compose.foundation.layout.height
import androidx.compose.foundation.layout.padding
import androidx.compose.foundation.layout.size
import androidx.compose.foundation.layout.width
import androidx.compose.foundation.rememberScrollState
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.foundation.verticalScroll
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.automirrored.outlined.MenuBook
import androidx.compose.material.icons.automirrored.outlined.Notes
import androidx.compose.material.icons.automirrored.outlined.ExitToApp
import androidx.compose.material.icons.outlined.Add
import androidx.compose.material.icons.outlined.CalendarMonth
import androidx.compose.material.icons.outlined.CheckCircle
import androidx.compose.material.icons.outlined.Notifications
import androidx.compose.material.icons.outlined.Person
import androidx.compose.material.icons.outlined.Refresh
import androidx.compose.material.icons.outlined.Settings
import androidx.compose.material3.Button
import androidx.compose.material3.ButtonDefaults
import androidx.compose.material3.CardDefaults
import androidx.compose.material3.CircularProgressIndicator
import androidx.compose.material3.Icon
import androidx.compose.material3.IconButton
import androidx.compose.material3.MaterialTheme
import androidx.compose.material3.NavigationBar
import androidx.compose.material3.NavigationBarItem
import androidx.compose.material3.OutlinedTextField
import androidx.compose.material3.Scaffold
import androidx.compose.material3.Surface
import androidx.compose.material3.Switch
import androidx.compose.material3.Text
import androidx.compose.material3.TextButton
import androidx.compose.runtime.Composable
import androidx.compose.runtime.LaunchedEffect
import androidx.compose.runtime.getValue
import androidx.compose.runtime.mutableStateOf
import androidx.compose.runtime.remember
import androidx.compose.runtime.rememberCoroutineScope
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.runtime.setValue
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.ImeAction
import androidx.compose.ui.text.input.KeyboardType
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import androidx.security.crypto.EncryptedSharedPreferences
import androidx.security.crypto.MasterKey
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.SupervisorJob
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject
import java.io.BufferedReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.util.Calendar
import java.util.Locale
import java.util.UUID

private val Wine = Color(0xFF722F37)
private val LiturgicalRed = Color(0xFF8B0000)
private val Gold = Color(0xFFC5A059)
private val Ivory = Color(0xFFFDFBF7)
private val Graphite = Color(0xFF2C2C2C)
private val DarkGraphite = Color(0xFF1A1A1A)
private val Muted = Color(0xFF6B6A68)

private enum class NativeTab(val label: String, val icon: ImageVector) {
    Mission("Missão", Icons.Outlined.Add),
    Schedules("Escalas", Icons.Outlined.CalendarMonth),
    Formation("Formação", Icons.AutoMirrored.Outlined.MenuBook),
    Profile("Perfil", Icons.Outlined.Person),
    Settings("Ajustes", Icons.Outlined.Settings),
}

private sealed interface NativeSessionState {
    data object Checking : NativeSessionState
    data object SignedOut : NativeSessionState
    data object SignedIn : NativeSessionState
}

private data class NativeUser(
    val id: String,
    val name: String,
    val email: String,
    val role: String,
)

private data class NativeMission(
    val id: String,
    val date: String,
    val time: String,
    val type: String,
    val location: String,
    val position: String,
    val status: String,
    val canConfirm: Boolean,
)

private data class NativeNotice(val title: String, val message: String, val read: Boolean)

private data class NativeFormationTrack(
    val title: String,
    val modules: Int,
    val lessons: Int,
    val progress: Int,
)

private data class NativeSchedule(
    val id: String,
    val date: String,
    val time: String,
    val title: String,
    val position: String,
    val isCurrentUser: Boolean,
)

private data class NativeSnapshot(
    val user: NativeUser,
    val communityName: String,
    val communityId: String,
    val nextMission: NativeMission?,
    val notices: List<NativeNotice>,
    val schedules: List<NativeSchedule>,
    val formation: List<NativeFormationTrack>,
)

private data class NativeCredentials(
    val accessToken: String,
    val refreshToken: String,
    val communityId: String,
)

private class NativeSessionStore(context: Context) {
    private val preferences = EncryptedSharedPreferences.create(
        context,
        "mesc_native_android_session",
        MasterKey.Builder(context).setKeyScheme(MasterKey.KeyScheme.AES256_GCM).build(),
        EncryptedSharedPreferences.PrefKeyEncryptionScheme.AES256_SIV,
        EncryptedSharedPreferences.PrefValueEncryptionScheme.AES256_GCM,
    )

    val deviceId: String
        get() {
            val existing = preferences.getString("device_id", null)
            if (!existing.isNullOrBlank()) return existing
            return UUID.randomUUID().toString().also { preferences.edit().putString("device_id", it).apply() }
        }

    fun load(): NativeCredentials? {
        val accessToken = preferences.getString("access_token", null) ?: return null
        val refreshToken = preferences.getString("refresh_token", null) ?: return null
        return NativeCredentials(accessToken, refreshToken, preferences.getString("community_id", null).orEmpty())
    }

    fun save(credentials: NativeCredentials) {
        preferences.edit()
            .putString("access_token", credentials.accessToken)
            .putString("refresh_token", credentials.refreshToken)
            .putString("community_id", credentials.communityId)
            .apply()
    }

    fun clear() {
        preferences.edit().remove("access_token").remove("refresh_token").remove("community_id").apply()
    }
}

private class NativeApiException(message: String, val statusCode: Int? = null) : Exception(message)

private class NativeMescApi(private val sessionStore: NativeSessionStore) {
    private val baseUrl = "https://saojudastadeu.app/api/mobile/v1"

    suspend fun login(email: String, password: String, keepSignedIn: Boolean): NativeSnapshot {
        val response = request(
            method = "POST",
            path = "auth/login",
            body = JSONObject()
                .put("email", email)
                .put("password", password)
                .put("keepSignedIn", keepSignedIn)
                .put("deviceId", sessionStore.deviceId)
                .put("platform", "android")
                .put("appVersion", BuildConfig.VERSION_NAME),
        )
        val auth = response.getJSONObject("auth")
        val user = response.getJSONObject("user")
        val activeCommunityId = response.optString("activeCommunityId")
        sessionStore.save(
            NativeCredentials(
                accessToken = auth.getString("accessToken"),
                refreshToken = auth.getString("refreshToken"),
                communityId = activeCommunityId,
            ),
        )
        return loadSnapshot(user, activeCommunityId)
    }

    suspend fun restore(): NativeSnapshot? {
        val credentials = sessionStore.load() ?: return null
        return try {
            loadSnapshot(credentials = credentials)
        } catch (error: NativeApiException) {
            if (error.statusCode !in listOf(401, 403)) throw error
            val refreshed = request(
                method = "POST",
                path = "auth/refresh",
                body = JSONObject().put("refreshToken", credentials.refreshToken).put("deviceId", sessionStore.deviceId),
            )
            val auth = refreshed.getJSONObject("auth")
            val communityId = refreshed.optString("activeCommunityId", credentials.communityId)
            sessionStore.save(NativeCredentials(auth.getString("accessToken"), auth.getString("refreshToken"), communityId))
            loadSnapshot(refreshed.getJSONObject("user"), communityId)
        }
    }

    suspend fun reload(): NativeSnapshot {
        return loadSnapshot(credentials = sessionStore.load() ?: throw NativeApiException("Sessão encerrada."))
    }

    suspend fun confirmSchedule(scheduleId: String) {
        val credentials = sessionStore.load() ?: throw NativeApiException("Sessão encerrada.")
        request(
            method = "POST",
            path = "schedules/$scheduleId/confirm",
            body = JSONObject(),
            accessToken = credentials.accessToken,
            communityId = credentials.communityId,
            idempotencyKey = UUID.randomUUID().toString(),
        )
    }

    private suspend fun loadSnapshot(initialUser: JSONObject? = null, initialCommunityId: String? = null, credentials: NativeCredentials? = null): NativeSnapshot {
        val currentCredentials = credentials ?: sessionStore.load() ?: throw NativeApiException("Sessão encerrada.")
        val token = currentCredentials.accessToken
        val initial = initialUser ?: request("GET", "auth/me", accessToken = token, communityId = currentCredentials.communityId)
            .getJSONObject("user")
        val communityId = initialCommunityId?.ifBlank { null }
            ?: currentCredentials.communityId.ifBlank { null }
            ?: initial.optString("homeCommunityId")
        val month = currentMonth()
        val home = request("GET", "mission/home?month=$month", accessToken = token, communityId = communityId)
        val schedules = request("GET", "schedules/month?month=$month", accessToken = token, communityId = communityId)
        val formation = runCatching {
            request("GET", "formation/overview", accessToken = token, communityId = communityId)
        }.getOrNull()
        val homeCommunity = home.optJSONObject("community")
        val effectiveCommunityId = homeCommunity?.optString("id")?.ifBlank { communityId } ?: communityId
        if (!effectiveCommunityId.isNullOrBlank() && effectiveCommunityId != currentCredentials.communityId) {
            sessionStore.save(currentCredentials.copy(communityId = effectiveCommunityId))
        }
        return NativeSnapshot(
            user = parseUser(home.optJSONObject("user") ?: initial),
            communityName = homeCommunity?.optString("name").orEmpty().ifBlank { "Comunidade" },
            communityId = effectiveCommunityId.orEmpty(),
            nextMission = home.optJSONObject("nextMission")?.let(::parseMission),
            notices = home.optJSONArray("notices").toList().map(::parseNotice),
            schedules = parseSchedules(schedules),
            formation = parseFormation(formation),
        )
    }

    private suspend fun request(
        method: String,
        path: String,
        body: JSONObject? = null,
        accessToken: String? = null,
        communityId: String? = null,
        idempotencyKey: String? = null,
    ): JSONObject = withContext(Dispatchers.IO) {
        val connection = (URL("$baseUrl/$path").openConnection() as HttpURLConnection).apply {
            requestMethod = method
            connectTimeout = 20_000
            readTimeout = 20_000
            setRequestProperty("Accept", "application/json")
            setRequestProperty("User-Agent", "MESCNative-Android")
            setRequestProperty("X-Device-Id", sessionStore.deviceId)
            accessToken?.let { setRequestProperty("Authorization", "Bearer $it") }
            communityId?.takeIf { it.isNotBlank() }?.let { setRequestProperty("X-Community-Id", it) }
            idempotencyKey?.let { setRequestProperty("Idempotency-Key", it) }
            if (body != null) {
                doOutput = true
                setRequestProperty("Content-Type", "application/json")
            }
        }
        try {
            body?.let {
                OutputStreamWriter(connection.outputStream, Charsets.UTF_8).use { writer -> writer.write(it.toString()) }
            }
            val stream = if (connection.responseCode in 200..299) connection.inputStream else connection.errorStream
            val text = stream?.bufferedReader()?.use(BufferedReader::readText).orEmpty()
            val payload = text.takeIf { it.isNotBlank() }?.let(::JSONObject) ?: JSONObject()
            if (connection.responseCode !in 200..299) {
                throw NativeApiException(payload.optString("message").ifBlank { "Erro ${connection.responseCode} na API mobile." }, connection.responseCode)
            }
            payload
        } finally {
            connection.disconnect()
        }
    }

    private fun parseUser(value: JSONObject) = NativeUser(
        id = value.optString("id"),
        name = value.optString("name").ifBlank { "Ministro" },
        email = value.optString("email"),
        role = value.optString("role").ifBlank { "Ministro" },
    )

    private fun parseMission(value: JSONObject) = NativeMission(
        id = value.optString("id"),
        date = value.optString("date"),
        time = value.optString("time"),
        type = value.optString("type").ifBlank { "Celebração" },
        location = value.optString("location"),
        position = value.optInt("position", 0).takeIf { it > 0 }?.let { "Posição $it" } ?: "Posição a definir",
        status = value.optString("confirmationStatus").ifBlank { value.optString("status") },
        canConfirm = value.optBoolean("canConfirm"),
    )

    private fun parseNotice(value: JSONObject) = NativeNotice(
        title = value.optString("title").ifBlank { "Aviso" },
        message = value.optString("message"),
        read = value.optBoolean("read"),
    )

    private fun parseSchedules(value: JSONObject): List<NativeSchedule> {
        val assignments = value.optJSONObject("publicSchedule")?.optJSONArray("assignments")
        val source = assignments ?: value.optJSONArray("schedules")
        return source.toList().map { item ->
            NativeSchedule(
                id = item.optString("scheduleId").ifBlank { item.optString("id") },
                date = item.optString("date"),
                time = item.optString("time"),
                title = item.optString("scheduleDisplayName").ifBlank { item.optString("type", "Celebração") },
                position = item.optInt("position", 0).takeIf { it > 0 }?.let { "Posição $it" } ?: "",
                isCurrentUser = item.optBoolean("isCurrentUser"),
            )
        }
    }

    private fun parseFormation(value: JSONObject?): List<NativeFormationTrack> {
        val tracks = value?.optJSONObject("overview")?.optJSONArray("tracks") ?: return emptyList()
        return tracks.toList().map { track ->
            val stats = track.optJSONObject("stats")
            NativeFormationTrack(
                title = track.optString("title", "Formação"),
                modules = stats?.optInt("totalModules") ?: 0,
                lessons = stats?.optInt("totalLessons") ?: 0,
                progress = stats?.optInt("progressPercentage") ?: 0,
            )
        }
    }

    private fun JSONArray?.toList(): List<JSONObject> {
        if (this == null) return emptyList()
        return List(length()) { index -> optJSONObject(index) ?: JSONObject() }
    }

    private fun currentMonth(): String {
        val calendar = Calendar.getInstance()
        return String.format(Locale.US, "%04d-%02d", calendar.get(Calendar.YEAR), calendar.get(Calendar.MONTH) + 1)
    }
}

private class MescNativeModel(context: Context) {
    private val store = NativeSessionStore(context.applicationContext)
    private val api = NativeMescApi(store)
    private val scope = CoroutineScope(SupervisorJob() + Dispatchers.Main)

    var sessionState by mutableStateOf<NativeSessionState>(NativeSessionState.Checking)
        private set
    var snapshot by mutableStateOf<NativeSnapshot?>(null)
        private set
    var isBusy by mutableStateOf(false)
        private set
    var message by mutableStateOf<String?>(null)
        private set

    init {
        scope.launch {
            try {
                snapshot = api.restore()
                sessionState = if (snapshot == null) NativeSessionState.SignedOut else NativeSessionState.SignedIn
            } catch (_: Exception) {
                store.clear()
                sessionState = NativeSessionState.SignedOut
            }
        }
    }

    fun signIn(email: String, password: String, keepSignedIn: Boolean) {
        if (email.isBlank() || password.isBlank()) {
            message = "Informe e-mail e senha."
            return
        }
        scope.launch {
            isBusy = true
            message = null
            try {
                snapshot = api.login(email.trim(), password, keepSignedIn)
                sessionState = NativeSessionState.SignedIn
            } catch (error: Exception) {
                message = error.message ?: "Não foi possível entrar agora."
            } finally {
                isBusy = false
            }
        }
    }

    fun reload() {
        scope.launch {
            isBusy = true
            message = null
            try {
                snapshot = api.reload()
            } catch (error: Exception) {
                message = error.message ?: "Não foi possível atualizar os dados."
            } finally {
                isBusy = false
            }
        }
    }

    fun confirm(scheduleId: String) {
        scope.launch {
            isBusy = true
            message = null
            try {
                api.confirmSchedule(scheduleId)
                snapshot = api.reload()
                message = "Presença confirmada."
            } catch (error: Exception) {
                message = error.message ?: "Não foi possível confirmar a presença."
            } finally {
                isBusy = false
            }
        }
    }

    fun signOut() {
        store.clear()
        snapshot = null
        message = null
        sessionState = NativeSessionState.SignedOut
    }

    fun showMessage(value: String?) {
        message = value
    }
}

@Composable
fun MescNativeApp() {
    val context = androidx.compose.ui.platform.LocalContext.current
    val model = remember { MescNativeModel(context.applicationContext) }
    MaterialTheme(
        colorScheme = MaterialTheme.colorScheme.copy(
            primary = Wine,
            secondary = Gold,
            surface = Ivory,
            onSurface = Graphite,
            background = Ivory,
            onBackground = Graphite,
        ),
    ) {
        when (model.sessionState) {
            NativeSessionState.Checking -> NativeLoadingScreen()
            NativeSessionState.SignedOut -> NativeLoginScreen(model)
            NativeSessionState.SignedIn -> NativeShell(model)
        }
    }
}

@Composable
private fun NativeLoadingScreen() {
    Box(
        modifier = Modifier.fillMaxSize().background(Ivory),
        contentAlignment = Alignment.Center,
    ) {
        Column(horizontalAlignment = Alignment.CenterHorizontally, verticalArrangement = Arrangement.spacedBy(14.dp)) {
            Text("✝", fontSize = 44.sp, color = Gold)
            Text("MESC", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 30.sp, color = Wine)
            CircularProgressIndicator(color = Wine, modifier = Modifier.size(28.dp))
        }
    }
}

@Composable
private fun NativeLoginScreen(model: MescNativeModel) {
    var email by rememberSaveable { mutableStateOf("") }
    var password by rememberSaveable { mutableStateOf("") }
    var keepSignedIn by rememberSaveable { mutableStateOf(true) }
    val scroll = rememberScrollState()
    Box(modifier = Modifier.fillMaxSize().background(Ivory)) {
        Column(
            modifier = Modifier.fillMaxSize().verticalScroll(scroll).padding(horizontal = 24.dp, vertical = 36.dp),
            verticalArrangement = Arrangement.spacedBy(16.dp),
        ) {
            Spacer(Modifier.height(30.dp))
            Text("✝", fontSize = 56.sp, color = Gold)
            Text("MESC", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 38.sp, color = Wine)
            Text("Santuário São Judas Tadeu", color = Muted, fontSize = 17.sp)
            Spacer(Modifier.height(12.dp))
            GlassPanel {
                Text("Entrar", fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Graphite)
                Text("Acesse suas escalas, formação e avisos.", color = Muted)
                Spacer(Modifier.height(8.dp))
                OutlinedTextField(
                    value = email,
                    onValueChange = { email = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("E-mail") },
                    singleLine = true,
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Email, imeAction = ImeAction.Next),
                )
                OutlinedTextField(
                    value = password,
                    onValueChange = { password = it },
                    modifier = Modifier.fillMaxWidth(),
                    label = { Text("Senha") },
                    singleLine = true,
                    visualTransformation = PasswordVisualTransformation(),
                    keyboardOptions = KeyboardOptions(keyboardType = KeyboardType.Password, imeAction = ImeAction.Done),
                )
                Row(verticalAlignment = Alignment.CenterVertically, modifier = Modifier.fillMaxWidth()) {
                    Switch(checked = keepSignedIn, onCheckedChange = { keepSignedIn = it })
                    Spacer(Modifier.width(10.dp))
                    Text("Manter sessão neste aparelho", color = Graphite)
                }
                model.message?.let { NativeMessage(it, isError = true) }
                Button(
                    onClick = { model.signIn(email, password, keepSignedIn) },
                    enabled = !model.isBusy,
                    modifier = Modifier.fillMaxWidth(),
                    colors = ButtonDefaults.buttonColors(containerColor = Wine),
                ) {
                    if (model.isBusy) CircularProgressIndicator(color = Color.White, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
                    else Text("Entrar")
                }
            }
            Text("A sessão e os tokens deste aparelho são protegidos pelo armazenamento seguro do Android.", color = Muted, fontSize = 12.sp)
        }
    }
}

@Composable
private fun NativeShell(model: MescNativeModel) {
    var selectedTab by rememberSaveable { mutableStateOf(NativeTab.Mission) }
    Scaffold(
        containerColor = Ivory,
        bottomBar = {
            NavigationBar(containerColor = Ivory.copy(alpha = 0.94f), tonalElevation = 8.dp) {
                NativeTab.entries.forEach { tab ->
                    NavigationBarItem(
                        selected = selectedTab == tab,
                        onClick = { selectedTab = tab },
                        icon = { Icon(tab.icon, contentDescription = tab.label) },
                        label = { Text(tab.label, maxLines = 1, overflow = TextOverflow.Ellipsis) },
                    )
                }
            }
        },
    ) { padding ->
        val snapshot = model.snapshot
        Column(modifier = Modifier.fillMaxSize().padding(padding).background(Ivory)) {
            NativeTopBar(
                title = selectedTab.label,
                subtitle = snapshot?.communityName ?: "MESC São Judas Tadeu",
                busy = model.isBusy,
                onRefresh = model::reload,
            )
            model.message?.let { NativeMessage(it, isError = false, modifier = Modifier.padding(horizontal = 20.dp, vertical = 8.dp)) }
            when (selectedTab) {
                NativeTab.Mission -> MissionScreen(model, snapshot)
                NativeTab.Schedules -> SchedulesScreen(snapshot)
                NativeTab.Formation -> FormationScreen(snapshot)
                NativeTab.Profile -> ProfileScreen(snapshot)
                NativeTab.Settings -> SettingsScreen(model, snapshot)
            }
        }
    }
}

@Composable
private fun NativeTopBar(title: String, subtitle: String, busy: Boolean, onRefresh: () -> Unit) {
    Row(
        modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 14.dp),
        verticalAlignment = Alignment.CenterVertically,
    ) {
        Text("✝", color = Wine, fontSize = 26.sp)
        Spacer(Modifier.width(10.dp))
        Column(modifier = Modifier.weight(1f)) {
            Text(title, fontFamily = FontFamily.Serif, fontSize = 24.sp, fontWeight = FontWeight.Bold, color = Graphite)
            Text(subtitle, fontSize = 12.sp, color = Muted, maxLines = 1, overflow = TextOverflow.Ellipsis)
        }
        IconButton(onClick = onRefresh, enabled = !busy) {
            if (busy) CircularProgressIndicator(color = Wine, modifier = Modifier.size(20.dp), strokeWidth = 2.dp)
            else Icon(Icons.Outlined.Refresh, contentDescription = "Atualizar", tint = Wine)
        }
    }
}

@Composable
private fun MissionScreen(model: MescNativeModel, snapshot: NativeSnapshot?) {
    val scroll = rememberScrollState()
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(scroll).padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(14.dp),
    ) {
        Text("Paz e bem, ${snapshot?.user?.name?.substringBefore(" ") ?: "ministro"}", fontSize = 18.sp, color = Graphite)
        snapshot?.nextMission?.let { mission ->
            GlassPanel(highlight = true) {
                Row(verticalAlignment = Alignment.CenterVertically) {
                    Icon(Icons.Outlined.Add, contentDescription = null, tint = Gold, modifier = Modifier.size(30.dp))
                    Spacer(Modifier.width(10.dp))
                    Text("Próxima missão", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 23.sp, color = Wine)
                }
                Text("${mission.date} às ${mission.time}", fontSize = 19.sp, fontWeight = FontWeight.SemiBold, color = Graphite)
                Text(listOf(mission.type, mission.location).filter { it.isNotBlank() }.joinToString(" • "), color = Muted)
                Text(mission.position, color = Wine, fontWeight = FontWeight.Medium)
                if (mission.canConfirm) {
                    Button(
                        onClick = { model.confirm(mission.id) },
                        enabled = !model.isBusy,
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = Wine),
                    ) { Text("Confirmar presença") }
                }
            }
        } ?: GlassPanel {
            Text("Nenhuma missão publicada", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 22.sp, color = Wine)
            Text("Quando houver uma escala para você, ela aparecerá aqui.", color = Muted)
        }
        if (!snapshot?.notices.isNullOrEmpty()) {
            Text("Avisos", fontFamily = FontFamily.Serif, fontSize = 22.sp, fontWeight = FontWeight.Bold, color = Graphite)
            snapshot!!.notices.forEach { notice ->
                GlassPanel {
                    Text(notice.title, fontWeight = FontWeight.SemiBold, color = Graphite)
                    Text(notice.message, color = Muted)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun SchedulesScreen(snapshot: NativeSnapshot?) {
    val schedules = snapshot?.schedules.orEmpty()
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        GlassPanel {
            Text("Escalas do mês", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 23.sp, color = Wine)
            Text("A lista mostra suas missas e a escala publicada da comunidade.", color = Muted)
        }
        if (schedules.isEmpty()) {
            EmptyPanel("Nenhuma escala disponível", "Acompanhe esta área após a publicação da escala.")
        } else {
            schedules.forEach { schedule ->
                GlassPanel(highlight = schedule.isCurrentUser) {
                    Text("${schedule.date} às ${schedule.time}", fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Graphite)
                    Text(schedule.title, color = Wine, fontWeight = FontWeight.Medium)
                    if (schedule.position.isNotBlank()) Text(schedule.position, color = Muted)
                    if (schedule.isCurrentUser) Text("Você está escalado", color = Wine, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun FormationScreen(snapshot: NativeSnapshot?) {
    val tracks = snapshot?.formation.orEmpty()
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        GlassPanel {
            Text("Formação", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 23.sp, color = Wine)
            Text("Acompanhe os conteúdos e o seu avanço de formação.", color = Muted)
        }
        if (tracks.isEmpty()) {
            EmptyPanel("Formação indisponível", "Toque em atualizar para consultar os conteúdos da comunidade.")
        } else {
            tracks.forEach { track ->
                GlassPanel {
                    Text(track.title, fontWeight = FontWeight.Bold, fontSize = 18.sp, color = Graphite)
                    Text("${track.modules} módulos • ${track.lessons} aulas", color = Muted)
                    Text("${track.progress}% concluído", color = Wine, fontWeight = FontWeight.SemiBold)
                }
            }
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun ProfileScreen(snapshot: NativeSnapshot?) {
    val user = snapshot?.user
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        GlassPanel(highlight = true) {
            Icon(Icons.Outlined.Person, contentDescription = null, tint = Gold, modifier = Modifier.size(34.dp))
            Text(user?.name ?: "Ministro", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 24.sp, color = Wine)
            Text(user?.email.orEmpty(), color = Muted)
            Text(user?.role.orEmpty(), color = Graphite)
        }
        GlassPanel {
            Text("Comunidade", fontWeight = FontWeight.SemiBold, color = Graphite)
            Text(snapshot?.communityName ?: "Não identificada", color = Muted)
        }
    }
}

@Composable
private fun SettingsScreen(model: MescNativeModel, snapshot: NativeSnapshot?) {
    val context = androidx.compose.ui.platform.LocalContext.current
    val notificationsLauncher = rememberLauncherForActivityResult(ActivityResultContracts.RequestPermission()) { granted ->
        model.showMessage(if (granted) "Notificações permitidas neste aparelho." else "Você pode permitir notificações nos Ajustes do Android.")
    }
    val biometric = BiometricManager.from(context).canAuthenticate(BiometricManager.Authenticators.BIOMETRIC_STRONG)
    val biometricText = if (biometric == BiometricManager.BIOMETRIC_SUCCESS) "Impressão digital disponível" else "Biometria não disponível neste aparelho"
    Column(
        modifier = Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal = 20.dp, vertical = 8.dp),
        verticalArrangement = Arrangement.spacedBy(12.dp),
    ) {
        GlassPanel {
            Text("Ajustes do aparelho", fontFamily = FontFamily.Serif, fontWeight = FontWeight.Bold, fontSize = 23.sp, color = Wine)
            Text("Permissões e segurança do MESC neste Android.", color = Muted)
        }
        GlassPanel {
            Row(verticalAlignment = Alignment.CenterVertically) {
                Icon(Icons.Outlined.Notifications, contentDescription = null, tint = Wine)
                Spacer(Modifier.width(10.dp))
                Column(modifier = Modifier.weight(1f)) {
                    Text("Notificações", fontWeight = FontWeight.SemiBold, color = Graphite)
                    Text("Escalas, questionários e avisos", color = Muted, fontSize = 13.sp)
                }
                TextButton(onClick = {
                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) notificationsLauncher.launch(Manifest.permission.POST_NOTIFICATIONS)
                    else model.showMessage("Notificações disponíveis neste Android.")
                }) { Text("Permitir") }
            }
        }
        GlassPanel {
            Text("Biometria", fontWeight = FontWeight.SemiBold, color = Graphite)
            Text(biometricText, color = Muted)
            Text("O desbloqueio seguro será oferecido após a próxima etapa de validação da sessão Android.", color = Muted, fontSize = 13.sp)
        }
        GlassPanel {
            Text("Sessão", fontWeight = FontWeight.SemiBold, color = Graphite)
            Text(snapshot?.user?.email.orEmpty(), color = Muted)
            TextButton(onClick = model::signOut) {
                Icon(Icons.AutoMirrored.Outlined.ExitToApp, contentDescription = null)
                Spacer(Modifier.width(6.dp))
                Text("Sair")
            }
        }
        Spacer(Modifier.height(12.dp))
    }
}

@Composable
private fun GlassPanel(highlight: Boolean = false, content: @Composable ColumnScope.() -> Unit) {
    Surface(
        modifier = Modifier.fillMaxWidth(),
        shape = RoundedCornerShape(12.dp),
        color = if (highlight) Color.White.copy(alpha = 0.86f) else Color.White.copy(alpha = 0.72f),
        border = androidx.compose.foundation.BorderStroke(1.dp, if (highlight) Gold.copy(alpha = 0.34f) else Gold.copy(alpha = 0.16f)),
        shadowElevation = 8.dp,
    ) {
        Column(modifier = Modifier.padding(18.dp), verticalArrangement = Arrangement.spacedBy(8.dp), content = content)
    }
}

@Composable
private fun EmptyPanel(title: String, detail: String) {
    GlassPanel {
        Text(title, fontWeight = FontWeight.Bold, color = Graphite)
        Text(detail, color = Muted)
    }
}

@Composable
private fun NativeMessage(value: String, isError: Boolean, modifier: Modifier = Modifier) {
    val color = if (isError) LiturgicalRed else Wine
    Text(
        value,
        modifier = modifier.fillMaxWidth().clip(RoundedCornerShape(10.dp)).background(color.copy(alpha = 0.10f)).border(1.dp, color.copy(alpha = 0.32f), RoundedCornerShape(10.dp)).padding(12.dp),
        color = color,
        fontSize = 14.sp,
    )
}
