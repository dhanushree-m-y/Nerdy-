// First-play coaching, break reminders and the end-of-world celebration banner.
import React, { useEffect, useRef, useState } from 'react';
import { Text, View } from 'react-native';
import { Numi } from './characters';
import { Enter, Pop, PulseRing } from './motion';
import { ChunkyButton, Tap } from './ui';
import { haptic } from '../services/feedback';
import { speakLine } from '../services/narrator';
import { useGame } from '../store/game';
import { C, F, softShadow, T } from '../theme/tokens';

/**
 * A one-time tip from NUMI. Shows once per `id`, then never again.
 * Deliberately non-blocking: it sits at the bottom and can be dismissed with one tap.
 */
export function FirstTimeTip({ id, text, delay = 900 }: { id: string; text: string; delay?: number }) {
  const seen = useGame(s => s.seenTips.includes(id));
  const markSeen = useGame(s => s.markTipSeen);
  const autoSpeak = useGame(s => s.settings.autoSpeak);
  const [show, setShow] = useState(false);
  const stop = useRef<() => void>(() => {});

  useEffect(() => {
    if (seen) return;
    const t = setTimeout(() => {
      setShow(true);
      if (autoSpeak) stop.current = speakLine(text, 'numi');
    }, delay);
    return () => { clearTimeout(t); stop.current(); };
  }, [seen]);

  if (seen || !show) return null;
  const close = () => { stop.current(); haptic.tap(); markSeen(id); setShow(false); };

  return (
    <Pop style={{ position: 'absolute', left: 14, right: 14, bottom: 150, zIndex: 120 }}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: C.violet, borderRadius: 24, padding: 12 }, softShadow(0.22, 8)]}>
        <Numi size={52} state="speaking" mood="happy" />
        <Text style={{ flex: 1, fontFamily: F.bodyBold, fontSize: 14, lineHeight: 20, color: C.cream }}>{text}</Text>
        <Tap onPress={close} a11y="Got it" style={{ backgroundColor: C.cream, borderRadius: 16, paddingVertical: 10, paddingHorizontal: 14 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.violetDeep }}>OK!</Text>
        </Tap>
      </View>
    </Pop>
  );
}

/** Minutes the child has been playing in this app session. */
let sessionStart = Date.now();
export const resetSessionClock = () => { sessionStart = Date.now(); };

/**
 * A kind nudge to stretch after a while — never a lock-out.
 * Grown-ups choose the interval (0 turns it off).
 */
export function BreakReminder() {
  const minutes = useGame(s => s.settings.breakMinutes);
  const name = useGame(s => s.explorer.name) || 'Explorer';
  const [due, setDue] = useState(false);
  const stop = useRef<() => void>(() => {});

  useEffect(() => {
    if (!minutes) return;
    const id = setInterval(() => {
      if (Date.now() - sessionStart >= minutes * 60000) setDue(true);
    }, 20000);
    return () => clearInterval(id);
  }, [minutes]);

  useEffect(() => {
    if (due) stop.current = speakLine(`Nice work, ${name}. Shall we stretch our legs for a moment?`, 'numi');
    return () => stop.current();
  }, [due]);

  if (!due) return null;
  const snooze = () => { stop.current(); haptic.tap(); resetSessionClock(); setDue(false); };

  return (
    <Enter style={{ position: 'absolute', left: 14, right: 14, bottom: 150, zIndex: 130 }}>
      <View style={[{ backgroundColor: C.cream, borderRadius: 26, padding: 14, flexDirection: 'row', alignItems: 'center', gap: 12 }, softShadow(0.2, 8)]}>
        <Numi size={54} mood="happy" state="speaking" />
        <View style={{ flex: 1 }}>
          <Text style={[T.h3, { fontSize: 17 }]}>Time to stretch!</Text>
          <Text style={[T.bodySm, { fontSize: 13 }]}>You've been exploring for {minutes} minutes. Numbershire will wait for you.</Text>
        </View>
        <Tap onPress={snooze} a11y="Keep playing" style={{ backgroundColor: C.teal, borderRadius: 16, paddingVertical: 11, paddingHorizontal: 13 }}>
          <Text style={{ fontFamily: F.display, fontSize: 14, color: C.cream }}>OK</Text>
        </Tap>
      </View>
    </Enter>
  );
}

/** Shown on the map when every area is restored: celebrate, then offer a new season. */
export function SeasonComplete({ onNewSeason }: { onNewSeason: () => void }) {
  const seasons = useGame(s => s.seasons);
  const name = useGame(s => s.explorer.name) || 'Explorer';
  useEffect(() => {
    haptic.chime();
    const stop = speakLine(`Numbershire is whole again, ${name}! Every place is glowing.`, 'numi');
    return stop;
  }, []);
  return (
    <Enter style={{ position: 'absolute', left: 14, right: 14, bottom: 150, zIndex: 120 }}>
      <View style={[{ backgroundColor: C.teal, borderRadius: 28, padding: 16 }, softShadow(0.24, 10)]}>
        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          <View style={{ alignItems: 'center', justifyContent: 'center' }}>
            <PulseRing color={C.sun} size={70} />
            <Numi size={64} mood="wow" state="celebrate" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={{ fontFamily: F.display, fontSize: 20, lineHeight: 24, color: C.cream }}>Numbershire is whole again!</Text>
            <Text style={{ fontFamily: F.bodyBold, fontSize: 13, lineHeight: 19, color: C.cream, opacity: 0.9 }}>
              {seasons > 0 ? `That's ${seasons + 1} times you've rebuilt it.` : 'Every place is lit, and every friend is home.'}
            </Text>
          </View>
        </View>
        <ChunkyButton
          label="Start a new season"
          icon="🌱"
          color={C.sun}
          shadow={C.sunDeep}
          textColor={C.ink}
          size="md"
          style={{ marginTop: 12 }}
          onPress={() => { haptic.levelUp(); onNewSeason(); }}
        />
        <Text style={{ fontFamily: F.body, fontSize: 11.5, lineHeight: 17, color: C.cream, opacity: 0.85, marginTop: 8 }}>
          A new season keeps your powers and backpack, and the places need you again with fresh puzzles.
        </Text>
      </View>
    </Enter>
  );
}
