; Aggiunge una checkbox "Create a desktop shortcut" nella pagina finale
; dell'installer. electron-builder crea/rimuove il collegamento sul desktop
; in modo incondizionato (createDesktopShortcut: true/false a livello di
; build); qui invece lo rendiamo un'opzione scelta dall'utente a runtime,
; riusando esattamente la stessa chiamata CreateShortCut usata internamente
; da electron-builder (vedi addDesktopLink in installer.nsh) cosi' il
; collegamento risulta identico a quello che verrebbe creato di default.

!macro customFinishPage
  !ifndef HIDE_RUN_AFTER_FINISH
    Function StartApp
      ${if} ${isUpdated}
        StrCpy $1 "--updated"
      ${else}
        StrCpy $1 ""
      ${endif}
      ${StdUtils.ExecShellAsUser} $0 "$launchLink" "open" "$1"
    FunctionEnd

    !define MUI_FINISHPAGE_RUN
    !define MUI_FINISHPAGE_RUN_FUNCTION "StartApp"
  !endif

  !define MUI_FINISHPAGE_SHOWREADME ""
  !define MUI_FINISHPAGE_SHOWREADME_TEXT "Create a desktop shortcut"
  !define MUI_FINISHPAGE_SHOWREADME_FUNCTION createDesktopShortcutFn

  Function createDesktopShortcutFn
    CreateShortCut "$newDesktopLink" "$appExe" "" "$appExe" 0 "" "" "${APP_DESCRIPTION}"
  FunctionEnd

  !insertmacro MUI_PAGE_FINISH
!macroend

; Il collegamento e' creato solo su richiesta (checkbox sopra), quindi va
; rimosso esplicitamente in disinstallazione: electron-builder salta questo
; passo quando createDesktopShortcut e' false.
!macro customUnInstall
  Delete "$oldDesktopLink"
!macroend
