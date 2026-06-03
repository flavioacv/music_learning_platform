import 'dart:async';
import 'dart:js_interop';
import 'package:web/web.dart' as web;

class AudioAssetPlayer {
  web.HTMLAudioElement? _audio;

  Future<void> play(String assetPath) async {
    final audio = web.HTMLAudioElement()
      ..preload = 'auto'
      ..src = _webAssetPath(assetPath)
      ..volume = 0.9;

    _audio?.pause();
    _audio = audio;

    await audio.play().toDart;
    await Future.any<void>([
      web.EventStreamProviders.endedEvent.forTarget(audio).first.then((_) {}),
      Future<void>.delayed(const Duration(seconds: 5), () {
        audio.pause();
        audio.currentTime = 0;
      }),
    ]);
  }

  void dispose() {
    _audio?.pause();
    _audio = null;
  }

  String _webAssetPath(String assetPath) {
    if (assetPath.startsWith('assets/')) {
      return 'assets/$assetPath';
    }

    return 'assets/assets/audio/$assetPath';
  }
}
