package pk.saudavo.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.app.AlertDialog;
import android.app.DownloadManager;
import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.IntentFilter;
import android.content.SharedPreferences;
import android.content.pm.PackageInfo;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.database.Cursor;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.os.SystemClock;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
import android.webkit.JavascriptInterface;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceError;
import android.webkit.WebResourceRequest;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.FrameLayout;
import android.widget.ProgressBar;
import android.widget.Toast;
import java.io.BufferedReader;
import java.io.InputStreamReader;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.util.concurrent.atomic.AtomicInteger;
import org.json.JSONObject;

public class MainActivity extends Activity {
  private static final String START_URL = "https://saudavo-web.vercel.app/";
  private static final String VERSION_ENDPOINT = "https://saudavo-web.vercel.app/api/app-version";
  private static final String DOWNLOAD_FALLBACK_URL = "https://saudavo-web.vercel.app/download";
  private static final String PREFS_NAME = "saudavo_prefs";
  private static final String KEY_LAST_WEB_BUILD_ID = "last_web_build_id";
  private static final String ALERT_CHANNEL_ID = "saudavo_alerts";
  private static final String EXTRA_TARGET_PATH = "saudavo_target_path";
  private static final long UPDATE_CHECK_COOLDOWN_MS = 15_000L;
  private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
  private static final int AUDIO_PERMISSION_REQUEST_CODE = 1002;
  private static final int NOTIF_PERMISSION_REQUEST_CODE = 1003;

  private final AtomicInteger notificationSeq = new AtomicInteger(100);
  private WebView webView;
  private ProgressBar progressBar;
  private ValueCallback<Uri[]> filePathCallback;
  private PermissionRequest pendingWebPermissionRequest;
  private long lastUpdateCheckElapsedMs = 0L;
  private boolean initialPageFinished = false;
  private boolean apkPromptShown = false;
  private long activeDownloadId = -1L;
  private BroadcastReceiver downloadCompleteReceiver;

  @SuppressLint({"SetJavaScriptEnabled", "AddJavascriptInterface"})
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);
    ensureNotificationChannel();

    FrameLayout root = new FrameLayout(this);
    root.setLayoutParams(new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
    ));
    root.setBackgroundColor(Color.WHITE);

    webView = new WebView(this);
    webView.setLayoutParams(new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        ViewGroup.LayoutParams.MATCH_PARENT
    ));

    progressBar = new ProgressBar(this, null, android.R.attr.progressBarStyleHorizontal);
    FrameLayout.LayoutParams progressParams = new FrameLayout.LayoutParams(
        ViewGroup.LayoutParams.MATCH_PARENT,
        8
    );
    progressParams.gravity = Gravity.TOP;
    progressBar.setLayoutParams(progressParams);
    progressBar.setMax(100);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      progressBar.setProgressTintList(ColorStateList.valueOf(Color.parseColor("#D96B27")));
    }

    root.addView(webView);
    root.addView(progressBar);
    setContentView(root);

    WebSettings settings = webView.getSettings();
    settings.setJavaScriptEnabled(true);
    settings.setDomStorageEnabled(true);
    settings.setDatabaseEnabled(true);
    settings.setAllowFileAccess(false);
    settings.setAllowContentAccess(true);
    settings.setCacheMode(WebSettings.LOAD_DEFAULT);
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setUseWideViewPort(true);
    settings.setLoadWithOverviewMode(true);

    webView.addJavascriptInterface(new SaudavoAndroidBridge(), "SaudavoAndroid");

    CookieManager cookieManager = CookieManager.getInstance();
    cookieManager.setAcceptCookie(true);
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
      cookieManager.setAcceptThirdPartyCookies(webView, true);
    }

    webView.setWebViewClient(new WebViewClient() {
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
        Uri uri = request.getUrl();
        return handleNavigationUri(uri);
      }

      @SuppressWarnings("deprecation")
      @Override
      public boolean shouldOverrideUrlLoading(WebView view, String url) {
        return handleNavigationUri(Uri.parse(url));
      }

      @Override
      public void onPageStarted(WebView view, String url, Bitmap favicon) {
        progressBar.setVisibility(View.VISIBLE);
      }

      @Override
      public void onPageFinished(WebView view, String url) {
        initialPageFinished = true;
        progressBar.setVisibility(View.GONE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.LOLLIPOP) {
          CookieManager.getInstance().flush();
        }
      }

      @Override
      public void onReceivedError(
          WebView view,
          WebResourceRequest request,
          WebResourceError error
      ) {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M && request.isForMainFrame()) {
          showOfflineFallback(view);
        }
      }
    });

    webView.setWebChromeClient(new WebChromeClient() {
      @Override
      public void onProgressChanged(WebView view, int newProgress) {
        progressBar.setProgress(newProgress);
        if (newProgress >= 100) {
          progressBar.setVisibility(View.GONE);
        }
      }

      @Override
      public boolean onShowFileChooser(
          WebView view,
          ValueCallback<Uri[]> filePathCallback,
          FileChooserParams fileChooserParams
      ) {
        if (MainActivity.this.filePathCallback != null) {
          MainActivity.this.filePathCallback.onReceiveValue(null);
        }
        MainActivity.this.filePathCallback = filePathCallback;
        try {
          Intent intent = fileChooserParams.createIntent();
          startActivityForResult(intent, FILE_CHOOSER_REQUEST_CODE);
          return true;
        } catch (Exception ex) {
          MainActivity.this.filePathCallback = null;
          return false;
        }
      }

      @Override
      public void onPermissionRequest(final PermissionRequest request) {
        runOnUiThread(() -> handleWebPermissionRequest(request));
      }
    });

    webView.setDownloadListener((url, userAgent, contentDisposition, mimetype, contentLength) -> {
      try {
        Intent intent = new Intent(Intent.ACTION_VIEW, Uri.parse(url));
        startActivity(intent);
      } catch (Exception ignored) {
      }
    });

    String initialUrl = resolveUrlFromIntent(getIntent());
    if (savedInstanceState != null && initialUrl == null) {
      webView.restoreState(savedInstanceState);
    } else {
      webView.loadUrl(initialUrl != null ? initialUrl : START_URL);
    }
    checkForLiveUpdates();
  }

  @Override
  protected void onNewIntent(Intent intent) {
    super.onNewIntent(intent);
    setIntent(intent);
    String targetUrl = resolveUrlFromIntent(intent);
    if (targetUrl != null && webView != null) {
      webView.loadUrl(targetUrl);
    }
  }

  private String resolveUrlFromIntent(Intent intent) {
    if (intent == null) return null;
    String rawPath = intent.getStringExtra(EXTRA_TARGET_PATH);
    if (rawPath == null) return null;
    String trimmed = rawPath.trim();
    if (!trimmed.startsWith("/")) return null;
    return "https://saudavo-web.vercel.app" + trimmed;
  }

  private void ensureNotificationChannel() {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
      NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
      if (nm != null && nm.getNotificationChannel(ALERT_CHANNEL_ID) == null) {
        NotificationChannel ch = new NotificationChannel(
            ALERT_CHANNEL_ID,
            "Saudavo Messages & Orders",
            NotificationManager.IMPORTANCE_HIGH
        );
        ch.setDescription("Live message, custom offer, and order updates from Saudavo.");
        nm.createNotificationChannel(ch);
      }
    }
  }

  private final class SaudavoAndroidBridge {
    @JavascriptInterface
    public void requestNotificationPermission() {
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
        runOnUiThread(() -> {
          if (checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
              != PackageManager.PERMISSION_GRANTED) {
            requestPermissions(
                new String[] { Manifest.permission.POST_NOTIFICATIONS },
                NOTIF_PERMISSION_REQUEST_CODE
            );
          }
        });
      }
    }

    @JavascriptInterface
    public void notify(String title, String body, String targetPath) {
      runOnUiThread(() -> showNativeNotification(title, body, targetPath));
    }
  }

  @SuppressWarnings("deprecation")
  private void showNativeNotification(String title, String body, String targetPath) {
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU &&
        checkSelfPermission(Manifest.permission.POST_NOTIFICATIONS)
            != PackageManager.PERMISSION_GRANTED) {
      return;
    }
    NotificationManager nm = (NotificationManager) getSystemService(Context.NOTIFICATION_SERVICE);
    if (nm == null) return;
    ensureNotificationChannel();

    Intent launchIntent = new Intent(this, MainActivity.class);
    launchIntent.addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP | Intent.FLAG_ACTIVITY_CLEAR_TOP);
    if (targetPath != null && targetPath.trim().startsWith("/")) {
      launchIntent.putExtra(EXTRA_TARGET_PATH, targetPath.trim());
    }
    int flags = PendingIntent.FLAG_UPDATE_CURRENT;
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
      flags |= PendingIntent.FLAG_IMMUTABLE;
    }
    PendingIntent pendingIntent = PendingIntent.getActivity(
        this,
        notificationSeq.get(),
        launchIntent,
        flags
    );

    Notification.Builder builder = Build.VERSION.SDK_INT >= Build.VERSION_CODES.O
        ? new Notification.Builder(this, ALERT_CHANNEL_ID)
        : new Notification.Builder(this);

    builder
        .setSmallIcon(R.mipmap.ic_launcher)
        .setContentTitle(title != null && !title.trim().isEmpty() ? title : "Saudavo")
        .setContentText(body != null ? body : "")
        .setAutoCancel(true)
        .setContentIntent(pendingIntent);

    nm.notify(notificationSeq.incrementAndGet(), builder.build());
  }

  @Override
  protected void onResume() {
    super.onResume();
    checkForLiveUpdates();
  }

  private void checkForLiveUpdates() {
    long now = SystemClock.elapsedRealtime();
    if (lastUpdateCheckElapsedMs > 0L && (now - lastUpdateCheckElapsedMs) < UPDATE_CHECK_COOLDOWN_MS) {
      return;
    }
    lastUpdateCheckElapsedMs = now;

    Thread worker = new Thread(() -> {
      HttpURLConnection conn = null;
      try {
        URL url = new URL(VERSION_ENDPOINT);
        conn = (HttpURLConnection) url.openConnection();
        conn.setRequestMethod("GET");
        conn.setUseCaches(false);
        conn.setRequestProperty("Cache-Control", "no-cache");
        conn.setConnectTimeout(4000);
        conn.setReadTimeout(4000);

        if (conn.getResponseCode() != HttpURLConnection.HTTP_OK) {
          return;
        }

        StringBuilder sb = new StringBuilder();
        try (BufferedReader reader = new BufferedReader(
            new InputStreamReader(conn.getInputStream(), StandardCharsets.UTF_8)
        )) {
          String line;
          while ((line = reader.readLine()) != null) {
            sb.append(line);
          }
        }

        JSONObject json = new JSONObject(sb.toString());
        String serverBuildId = json.optString("webBuildId", "").trim();
        int serverVersionCode = json.optInt("androidVersionCode", 0);
        String serverVersionName = json.optString("androidVersionName", "").trim();
        String apkUrl = json.optString("apkDownloadUrl", "").trim();
        String releaseNotes = json.optString("releaseNotes", "").trim();

        if (!serverBuildId.isEmpty() && !"local-dev".equals(serverBuildId)) {
          SharedPreferences prefs = getSharedPreferences(PREFS_NAME, MODE_PRIVATE);
          String previousBuildId = prefs.getString(KEY_LAST_WEB_BUILD_ID, "");
          if (!serverBuildId.equals(previousBuildId)) {
            prefs.edit().putString(KEY_LAST_WEB_BUILD_ID, serverBuildId).apply();
            final boolean shouldReload = !previousBuildId.isEmpty() || initialPageFinished;
            runOnUiThread(() -> {
              if (!isFinishing() && webView != null) {
                webView.clearCache(true);
                if (shouldReload) {
                  webView.reload();
                }
              }
            });
          }
        }

        int installedVersionCode = getInstalledVersionCode();
        if (serverVersionCode > installedVersionCode &&
            installedVersionCode > 0 &&
            !apkPromptShown &&
            !apkUrl.isEmpty()) {
          apkPromptShown = true;
          final String displayVersion = serverVersionName.isEmpty()
              ? String.valueOf(serverVersionCode)
              : serverVersionName;
          runOnUiThread(() -> showApkUpdateDialog(displayVersion, apkUrl, releaseNotes));
        }
      } catch (Exception ignored) {
        // Offline or unreachable endpoint; keep browsing session unaffected.
      } finally {
        if (conn != null) {
          conn.disconnect();
        }
      }
    }, "saudavo-update-check");
    worker.setDaemon(true);
    worker.start();
  }

  @SuppressWarnings("deprecation")
  private int getInstalledVersionCode() {
    try {
      PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
      if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
        return (int) info.getLongVersionCode();
      }
      return info.versionCode;
    } catch (Exception ex) {
      return 0;
    }
  }

  private void showApkUpdateDialog(
      String newVersionName,
      String apkUrl,
      String releaseNotes
  ) {
    if (isFinishing()) return;
    StringBuilder message = new StringBuilder();
    message.append("Saudavo v").append(newVersionName).append(" is now available.\n");
    message.append("سوداو ایپ کا نیا ورژن دستیاب ہے۔");
    if (!releaseNotes.isEmpty()) {
      message.append("\n\n").append(releaseNotes);
    }

    new AlertDialog.Builder(this)
        .setTitle("New Update Available • نیا اپڈیٹ")
        .setMessage(message.toString())
        .setCancelable(true)
        .setPositiveButton("Update Now / اپڈیٹ کریں", (dialog, which) ->
            downloadAndInstallApk(apkUrl, newVersionName)
        )
        .setNegativeButton("Later / بعد میں", null)
        .show();
  }

  @SuppressLint("UnspecifiedRegisterReceiverFlag")
  private void downloadAndInstallApk(String apkUrl, String versionName) {
    try {
      DownloadManager dm = (DownloadManager) getSystemService(Context.DOWNLOAD_SERVICE);
      if (dm == null) {
        openBrowserUrl(DOWNLOAD_FALLBACK_URL);
        return;
      }

      if (downloadCompleteReceiver == null) {
        downloadCompleteReceiver = new BroadcastReceiver() {
          @Override
          public void onReceive(Context context, Intent intent) {
            long id = intent.getLongExtra(DownloadManager.EXTRA_DOWNLOAD_ID, -1L);
            if (id != activeDownloadId || id < 0L) {
              return;
            }
            DownloadManager.Query query = new DownloadManager.Query().setFilterById(id);
            try (Cursor cursor = dm.query(query)) {
              if (cursor != null && cursor.moveToFirst()) {
                int statusIdx = cursor.getColumnIndex(DownloadManager.COLUMN_STATUS);
                if (statusIdx >= 0 && cursor.getInt(statusIdx) == DownloadManager.STATUS_SUCCESSFUL) {
                  Uri apkUri = dm.getUriForDownloadedFile(id);
                  if (apkUri != null) {
                    launchApkInstaller(apkUri);
                    return;
                  }
                }
              }
            } catch (Exception ignored) {
            }
            openBrowserUrl(DOWNLOAD_FALLBACK_URL);
          }
        };
        IntentFilter filter = new IntentFilter(DownloadManager.ACTION_DOWNLOAD_COMPLETE);
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.TIRAMISU) {
          registerReceiver(downloadCompleteReceiver, filter, Context.RECEIVER_EXPORTED);
        } else {
          registerReceiver(downloadCompleteReceiver, filter);
        }
      }

      String fileName = "Saudavo-v" + versionName.replaceAll("[^0-9A-Za-z._-]", "") + ".apk";
      DownloadManager.Request req = new DownloadManager.Request(Uri.parse(apkUrl));
      req.setTitle("Saudavo v" + versionName);
      req.setDescription("Downloading Saudavo app update...");
      req.setMimeType("application/vnd.android.package-archive");
      req.setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED);
      req.setDestinationInExternalFilesDir(this, Environment.DIRECTORY_DOWNLOADS, fileName);
      activeDownloadId = dm.enqueue(req);
      Toast.makeText(
          this,
          "Downloading Saudavo v" + versionName + "...",
          Toast.LENGTH_SHORT
      ).show();
    } catch (Exception ex) {
      openBrowserUrl(DOWNLOAD_FALLBACK_URL);
    }
  }

  private void launchApkInstaller(Uri apkUri) {
    try {
      Intent installIntent = new Intent(Intent.ACTION_VIEW);
      installIntent.setDataAndType(apkUri, "application/vnd.android.package-archive");
      installIntent.addFlags(
          Intent.FLAG_ACTIVITY_NEW_TASK | Intent.FLAG_GRANT_READ_URI_PERMISSION
      );
      startActivity(installIntent);
    } catch (Exception ex) {
      openBrowserUrl(DOWNLOAD_FALLBACK_URL);
    }
  }

  private void openBrowserUrl(String url) {
    try {
      startActivity(new Intent(Intent.ACTION_VIEW, Uri.parse(url)));
    } catch (Exception ignored) {
    }
  }

  private boolean handleNavigationUri(Uri uri) {
    if (uri == null) return false;
    String scheme = uri.getScheme();
    String host = uri.getHost();
    if (("https".equalsIgnoreCase(scheme)) &&
        host != null &&
        (host.equalsIgnoreCase("saudavo-web.vercel.app") ||
         host.equalsIgnoreCase("saudavo-api.vercel.app"))) {
      return false;
    }
    try {
      startActivity(new Intent(Intent.ACTION_VIEW, uri));
      return true;
    } catch (Exception ignored) {
      return true;
    }
  }

  private void handleWebPermissionRequest(PermissionRequest request) {
    String[] resources = request.getResources();
    boolean wantsAudio = false;
    for (String r : resources) {
      if (PermissionRequest.RESOURCE_AUDIO_CAPTURE.equals(r)) {
        wantsAudio = true;
      }
    }
    if (!wantsAudio) {
      request.deny();
      return;
    }
    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M &&
        checkSelfPermission(Manifest.permission.RECORD_AUDIO) != PackageManager.PERMISSION_GRANTED) {
      if (pendingWebPermissionRequest != null) {
        pendingWebPermissionRequest.deny();
      }
      pendingWebPermissionRequest = request;
      requestPermissions(
          new String[] { Manifest.permission.RECORD_AUDIO },
          AUDIO_PERMISSION_REQUEST_CODE
      );
      return;
    }
    request.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
  }

  private void showOfflineFallback(WebView view) {
    String html =
        "<!doctype html><html><head><meta name='viewport' content='width=device-width,initial-scale=1'>"
            + "<style>body{font-family:sans-serif;background:#F8FAF9;color:#12241E;display:flex;"
            + "align-items:center;justify-content:center;min-height:100vh;margin:0;padding:24px;text-align:center}"
            + ".card{background:#fff;border:1px solid #D7E5DE;border-radius:20px;padding:28px;max-width:340px}"
            + "h2{color:#0F6B52;margin:0 0 8px}p{font-size:14px;color:#4B635B;line-height:1.5}"
            + "button{margin-top:14px;background:#D96B27;color:#fff;border:none;border-radius:12px;"
            + "padding:12px 22px;font-weight:700;font-size:14px}</style></head><body><div class='card'>"
            + "<h2>Saudavo</h2><p>Unable to connect. Please check mobile data or Wi-Fi.<br>"
            + "انٹرنیٹ کنکشن چیک کریں۔</p>"
            + "<button onclick=\"location.href='https://saudavo-web.vercel.app/'\">Retry / دوبارہ کوشش</button>"
            + "</div></body></html>";
    view.loadDataWithBaseURL(START_URL, html, "text/html", "UTF-8", null);
  }

  @Override
  protected void onSaveInstanceState(Bundle outState) {
    super.onSaveInstanceState(outState);
    if (webView != null) {
      webView.saveState(outState);
    }
  }

  @Override
  protected void onDestroy() {
    if (downloadCompleteReceiver != null) {
      try {
        unregisterReceiver(downloadCompleteReceiver);
      } catch (Exception ignored) {
      }
      downloadCompleteReceiver = null;
    }
    super.onDestroy();
  }

  @Override
  public void onRequestPermissionsResult(
      int requestCode,
      String[] permissions,
      int[] grantResults
  ) {
    super.onRequestPermissionsResult(requestCode, permissions, grantResults);
    if (requestCode == AUDIO_PERMISSION_REQUEST_CODE && pendingWebPermissionRequest != null) {
      PermissionRequest req = pendingWebPermissionRequest;
      pendingWebPermissionRequest = null;
      if (grantResults.length > 0 && grantResults[0] == PackageManager.PERMISSION_GRANTED) {
        req.grant(new String[] { PermissionRequest.RESOURCE_AUDIO_CAPTURE });
      } else {
        req.deny();
      }
    }
  }

  @Override
  protected void onActivityResult(int requestCode, int resultCode, Intent data) {
    super.onActivityResult(requestCode, resultCode, data);
    if (requestCode == FILE_CHOOSER_REQUEST_CODE && filePathCallback != null) {
      Uri[] results = WebChromeClient.FileChooserParams.parseResult(resultCode, data);
      filePathCallback.onReceiveValue(results);
      filePathCallback = null;
    }
  }

  @SuppressWarnings("deprecation")
  @Override
  public void onBackPressed() {
    if (webView != null && webView.canGoBack()) {
      webView.goBack();
      return;
    }
    super.onBackPressed();
  }
}
