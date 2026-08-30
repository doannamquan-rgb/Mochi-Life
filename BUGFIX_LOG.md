# BUGFIX_LOG.md — Mochi Life Audit

> Nguyen tac: Khong ghi "Fixed" neu chua verify duoc. Moi bug ghi ro cach verify da lam.

---

## Baseline QA (chay that truoc khi sua bat ky thu gi)

npm run typecheck (web):    Exit 0 - PASS
npm run typecheck (mobile): Exit 0 - PASS
npm run test:               91/91 tests pass
npm run lint:               Exit 1 - 6 errors, 131 warnings

---

## BUG-01 - useMochiReaction.tsx: .current access in render body
Commit: 7a1bd5c
Symptom: useRef(new Animated.Value(-150)).current trong render body. React 19 vi pham react-hooks/refs. Toast animation co the reset khi re-render.
Root cause: Pattern cu (React 18) da bi deprecated.
Files: mobile/src/hooks/useMochiReaction.tsx
Fix: Doi thanh const xRef = useRef(val), dung xRef.current trong effects/callbacks/JSX.
Verify: typecheck mobile pass. Lint errors giam 4 -> 0.
Status: FIXED

---

## BUG-02 - app-lifecycle.ts: Date.now() impure in render
Commit: 7a1bd5c
Symptom: useRef<number>(Date.now()) - react-hooks/purity warning.
Fix: useRef<number>(0) + set value trong useEffect.
Side effect tot hon: Lan dau app load luon resync (lastResyncRef=0).
Verify: typecheck pass.
Status: FIXED

---

## BUG-03 - Unused catch variables (useMochiReaction, update-manager)
Commit: 7a1bd5c
Fix: catch (err) -> catch {}
Verify: typecheck pass.
Status: FIXED

---

## BUG-04 - KeyboardAwareContainer.tsx: Android keyboard khong avoid
Commit: 2f34cf0
Symptom: behavior=undefined la no-op tren Android. Form bi keyboard che.
Fix: behavior='height' cho Android.
Verify: typecheck pass. CAN TEST TREN ANDROID DEVICE.
Status: CODE FIXED - Can verify tren Android device/emulator

---

## BUG-05 - ai.tsx: Android chat input bi keyboard che
Commit: 2f34cf0
Symptom: Cung pattern voi BUG-04. Chat input bar bi an sau keyboard.
Fix: behavior='height' cho Android.
Verify: typecheck pass. CAN TEST TREN ANDROID.
Status: CODE FIXED - Can verify tren Android device/emulator

---

## BUG-06 - KeyboardSafeModal.tsx: maxHeightRatio prop bi ignore
Commit: d75c125
Symptom: maxHeight: '90%' hardcode trong StyleSheet, prop maxHeightRatio=0.88 bi ignore.
Fix: maxHeight: computed from prop trong inline style.
Verify: typecheck pass. Code inspection: dung prop khac nhau -> maxHeight khac nhau.
Status: FIXED

---

## BUG-07 - useChinese.ts: memory_level khong nhat quan voi SM-2
Commit: d907895
Symptom: Logic inline tinh memory_level khac voi getMemoryLevelFromSR() trong shared package.
Vi du: rating='hard', repetitions=0 -> 'learned' (sai, nen la 'hard').
Fix: memory_level: getMemoryLevelFromSR(nextSR)
Verify: typecheck pass. Code inspection vs spaced-repetition.ts: correct.
Status: FIXED

---

## BUG-08 - flashcard.tsx: Interval labels hardcode, misleading
Commit: adf054b
Symptom: 'Nho -> 4 ngay' nhung voi user da review 10 lan, interval thuc te la 20-30+ ngay.
Fix: useMemo tinh intervalPreviews tu SR state cua currentWord.
Verify: typecheck pass. voi repetitions=6: 'Nho' hien '1 thang nua'.
Status: FIXED

---

## BUG-09 - chinese.tsx: Vocab list silent cap 60 items
Commit: efeb9e3
Symptom: slice(0, 60) khong co indicator. User HSK4+ khong biet bi an 940+ tu.
Fix: Them note 'Dang hien thi 60/{total} tu' khi total > 60.
Verify: typecheck pass.
Status: FIXED

---

## Bugs ghi nhan nhung CHUA fix

BUG-10: Tab bar height khong tinh gesture nav Android - Can test thiet bi that truoc.
BUG-11: useChinese legacy vocab fallback - Can xac nhan business intent.
BUG-12: settings.tsx displayName late sync - Minor, partial fix da co.
BUG-13: clearButtonMode iOS-only - Minor UX.

---

## Tong ket

6 lint errors -> 0 errors
91/91 tests pass (no regression)
typecheck web + mobile: PASS
