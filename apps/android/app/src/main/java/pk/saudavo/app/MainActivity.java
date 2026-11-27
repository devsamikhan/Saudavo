package pk.saudavo.app;

import android.Manifest;
import android.annotation.SuppressLint;
import android.app.Activity;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.content.res.ColorStateList;
import android.graphics.Bitmap;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.view.Gravity;
import android.view.View;
import android.view.ViewGroup;
import android.webkit.CookieManager;
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

public class MainActivity extends Activity {
  private static final String START_URL = "https://saudavo-web.vercel.app/";
  private static final int FILE_CHOOSER_REQUEST_CODE = 1001;
  private static final int AUDIO_PERMISSION_REQUEST_CODE = 1002;

  private WebView webView;
  private ProgressBar progressBar;
  private ValueCallback<Uri[]> filePathCallback;
  private PermissionRequest pendingWebPermissionRequest;

  @SuppressLint("SetJavaScriptEnabled")
  @Override
  protected void onCreate(Bundle savedInstanceState) {
    super.onCreate(savedInstanceState);

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
    settings.setMediaPlaybackRequiresUserGesture(false);
    settings.setMixedContentMode(WebSettings.MIXED_CONTENT_NEVER_ALLOW);
    settings.setUseWideViewPort(true);
    settings.setLoadWithOverviewMode(true);

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

    if (savedInstanceState != null) {
      webView.restoreState(savedInstanceState);
    } else {
      webView.loadUrl(START_URL);
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
