/**
 * @module apl
 * @description Generador APL 1.6 para "Profesor Universal IA".
 *
 * NAVEGACIÓN D-PAD (Fire Stick):
 *   - Sequence vertical con snap:"start" — el D-pad para en cada sección, sin tirón.
 *   - Cada bloque de contenido es un item del Sequence con height fijo o auto.
 *   - TouchWrapper con focusable:true para que el D-pad pueda seleccionarlos.
 *   - Una sola versión funciona en táctil (Echo Show) y control remoto (Fire Stick).
 *
 * LOGOS: todos en S3 propio (PNG) — SVG de Wikipedia bloqueados en Fire TV.
 * MARKDOWN: strippeado en AskProfeIntentHandler antes de llegar aquí.
 */
function generarAPL(isDark) {
    const c = isDark ? {
        bg: "#121212", header: "#0D0D1A", content: "#121212", card: "#1E1E30",
        border: "#333355", textMain: "#E8E8E8", textTitle: "#00CAFF",
        textSub: "#E0E0E0", footer: "#0D0D1A",
        ctrlBg: "#1E1E30", ctrlBorder: "#444466", ctrlText: "#FFFFFF",
        ctrlBgHover: "#3A3A5E",
        zoomMinus: "#FF6347", zoomPlus: "#00CAFF", modeBg: "#2E7D32", whisperBg: "#4A4A6E"
    } : {
        bg: "#FFFFFF", header: "#1A1A2E", content: "#FFFFFF", card: "#FFFFFF",
        border: "#CCCCCC", textMain: "#1D8F3A", textTitle: "#1D8F3A",
        textSub: "#1D8F3A", footer: "#1A1A2E",
        ctrlBg: "#2A2A4E", ctrlBorder: "#AAAACC", ctrlText: "#FFFFFF",
        ctrlBgHover: "#4A4A7E",
        zoomMinus: "#FF6347", zoomPlus: "#00CAFF", modeBg: "#4A4A6E", whisperBg: "#4A4A6E"
    };

    // Aclara un color hex ~30% para el estado hover
    function brighten(hex) {
        const n = parseInt(hex.replace('#',''), 16);
        const r = Math.min(255, ((n >> 16) & 0xFF) + 60);
        const g = Math.min(255, ((n >> 8)  & 0xFF) + 60);
        const b = Math.min(255, ( n        & 0xFF) + 60);
        return '#' + [r,g,b].map(x => x.toString(16).padStart(2,'0')).join('');
    }

    // Botón de control D-pad friendly con hover/focus highlight
    function ctrlBtn(emoji, label, sendArgs, bg) {
        const btnId = `btn_${label.replace(/\s/g, '_')}`;
        const baseBg = bg || c.ctrlBg;
        const hoverBg = brighten(baseBg);
        return {
            type: "TouchWrapper",
            id: btnId,
            focusable: true,
            onPress: { type: "SendEvent", arguments: sendArgs },
            onFocus: { type: "SetValue", componentId: `${btnId}_frame`, property: "backgroundColor", value: hoverBg },
            onBlur:  { type: "SetValue", componentId: `${btnId}_frame`, property: "backgroundColor", value: baseBg },
            item: {
                type: "Frame",
                id: `${btnId}_frame`,
                backgroundColor: baseBg,
                borderRadius: "10dp",
                borderWidth: "2dp",
                borderColor: hoverBg,
                width: "82dp",
                height: "58dp",
                justifyContent: "center",
                alignItems: "center",
                items: [
                    { type: "Text", text: emoji, fontSize: "22dp", textAlign: "center" },
                    { type: "Text", text: label, color: c.ctrlText, fontSize: "11dp", textAlign: "center", marginTop: "3dp" }
                ]
            }
        };
    }

    // Item del Sequence: bloque de texto principal
    function bloqueTexto(textExpr, fontSize, color, italic) {
        return {
            type: "Container",
            width: "100%",
            paddingLeft: "20dp",
            paddingRight: "20dp",
            paddingTop: "16dp",
            paddingBottom: "16dp",
            backgroundColor: c.content,
            item: {
                type: "Text",
                text: textExpr,
                color: color || c.textMain,
                fontSize: fontSize || "20dp",
                fontStyle: italic ? "italic" : "normal",
                textAlign: "center",
                lineHeight: 1.4
            }
        };
    }

    // Item del Sequence: pod de imagen (Wolfram o extra)
    function bloqueImagen(urlExpr, tituloExpr, widthExpr, heightExpr) {
        return {
            type: "Container",
            width: "100%",
            paddingLeft: "12dp",
            paddingRight: "12dp",
            paddingTop: "10dp",
            paddingBottom: "10dp",
            backgroundColor: c.content,
            alignItems: "center",
            items: [
                { type: "Text", text: tituloExpr, color: c.textTitle, fontSize: "16dp", fontWeight: "bold", textAlign: "center", marginBottom: "8dp" },
                {
                    type: "Frame",
                    backgroundColor: c.card,
                    borderRadius: "8dp",
                    padding: "4dp",
                    borderWidth: "1dp",
                    borderColor: c.border,
                    width: widthExpr,
                    height: heightExpr,
                    item: { type: "Image", source: urlExpr, width: "100%", height: "100%", scale: "best-fit", align: "center" }
                }
            ]
        };
    }

    return {
        type: "APL",
        version: "1.6",
        theme: isDark ? "dark" : "light",
        styles: {
            sequenceStyle: {
                values: [
                    {
                        scrollbarColor: "transparent"
                    }
                ]
            }
        },
        mainTemplate: {
            parameters: ["templateData"],
            item: {
                type: "Container",
                id: "mainContainer",
                width: "100vw",
                height: "100vh",
                backgroundColor: c.bg,
                bind: [{ name: "zl", type: "number", value: "${templateData.zoomLevel || 85}" }],
                items: [

                    // ── HEADER ──────────────────────────────────────────────
                    {
                        type: "Container",
                        direction: "column",
                        width: "100%",
                        height: "106dp",
                        backgroundColor: c.header,
                        paddingLeft: "12dp",
                        paddingRight: "12dp",
                        paddingTop: "10dp",
                        paddingBottom: "8dp",
                        items: [
                            {
                                type: "Text",
                                text: "${templateData.titulo}",
                                color: "#FF6600",
                                fontSize: "18dp",
                                fontWeight: "bold",
                                textAlign: "center",
                                width: "100%",
                                marginBottom: "20dp"
                            },
                            // Fila de logos
                            {
                                type: "Container",
                                direction: "row",
                                width: "100%",
                                justifyContent: "space-around",
                                alignItems: "center",
                                paddingBottom: "12dp",
                                items: [
                                    { type: "Container", alignItems: "center", items: [
                                        { type: "Frame", backgroundColor: "#FFFFFF", borderRadius: "22dp", width: "44dp", height: "44dp", padding: "3dp",
                                            item: { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/github.png", width: "100%", height: "100%", scale: "best-fit" } },
                                        { type: "Text", text: "Powered by", color: "#666666", fontSize: "7dp", marginTop: "5dp", fontWeight: "400" },
                                        { type: "Text", text: "GitHub", color: "#999999", fontSize: "8dp", marginTop: "1dp", fontWeight: "500" }
                                    ]},
                                    { type: "Container", alignItems: "center", items: [
                                        { type: "Frame", backgroundColor: "#FFFFFF", borderRadius: "22dp", width: "44dp", height: "44dp", padding: "3dp",
                                            item: { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/aws.png", width: "100%", height: "100%", scale: "best-fit" } },
                                        { type: "Text", text: "Powered by", color: "#666666", fontSize: "7dp", marginTop: "5dp", fontWeight: "400" },
                                        { type: "Text", text: "AWS", color: "#999999", fontSize: "8dp", marginTop: "1dp", fontWeight: "500" }
                                    ]},
                                    { type: "Container", alignItems: "center", items: [
                                        { type: "Frame", backgroundColor: "#FFFFFF", borderRadius: "22dp", width: "44dp", height: "44dp", padding: "3dp",
                                            item: { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/claude.png", width: "100%", height: "100%", scale: "best-fit" } },
                                        { type: "Text", text: "Powered by", color: "#666666", fontSize: "7dp", marginTop: "5dp", fontWeight: "400" },
                                        { type: "Text", text: "Claude", color: "#999999", fontSize: "8dp", marginTop: "1dp", fontWeight: "500" }
                                    ]},
                                    { type: "Container", alignItems: "center", items: [
                                        { type: "Frame", backgroundColor: "#FFFFFF", borderRadius: "22dp", width: "44dp", height: "44dp", padding: "3dp",
                                            item: { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/wolfram.png", width: "100%", height: "100%", scale: "best-fit" } },
                                        { type: "Text", text: "Powered by", color: "#666666", fontSize: "7dp", marginTop: "5dp", fontWeight: "400" },
                                        { type: "Text", text: "WolframAlpha", color: "#999999", fontSize: "8dp", marginTop: "1dp", fontWeight: "500" }
                                    ]},
                                    { type: "Container", alignItems: "center", items: [
                                        { type: "Frame", backgroundColor: "#FFFFFF", borderRadius: "24dp", width: "48dp", height: "48dp", padding: "0dp",
                                            item: { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/nasa.png", width: "100%", height: "100%", scale: "best-fit" } },
                                        { type: "Text", text: "Powered by", color: "#666666", fontSize: "7dp", marginTop: "5dp", fontWeight: "400" },
                                        { type: "Text", text: "NASA", color: "#999999", fontSize: "8dp", marginTop: "1dp", fontWeight: "500" }
                                    ]},
                                    { type: "Container", alignItems: "center", items: [
                                        { type: "Frame", backgroundColor: "#FFFFFF", borderRadius: "22dp", width: "44dp", height: "44dp", padding: "3dp",
                                            item: { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/alexa.png", width: "100%", height: "100%", scale: "best-fit" } },
                                        { type: "Text", text: "Powered by", color: "#666666", fontSize: "7dp", marginTop: "5dp", fontWeight: "400" },
                                        { type: "Text", text: "Alexa", color: "#999999", fontSize: "8dp", marginTop: "1dp", fontWeight: "500" }
                                    ]},
                                    { type: "Container", alignItems: "center", items: [
                                        { type: "Frame", backgroundColor: "#FFFFFF", borderRadius: "22dp", width: "44dp", height: "44dp", padding: "3dp",
                                            item: { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/openai.png", width: "100%", height: "100%", scale: "best-fit" } },
                                        { type: "Text", text: "Powered by", color: "#666666", fontSize: "7dp", marginTop: "5dp", fontWeight: "400" },
                                        { type: "Text", text: "OpenAI", color: "#999999", fontSize: "8dp", marginTop: "1dp", fontWeight: "500" }
                                    ]},
                                    { type: "Container", alignItems: "center", width: "50dp", items: [
                                        { type: "Frame", backgroundColor: "#FFFFFF", borderRadius: "22dp", width: "44dp", height: "44dp", padding: "2dp", alignItems: "center", justifyContent: "center",
                                            item: { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/gemini.png", width: "100%", height: "100%", scale: "best-fit" } },
                                        { type: "Text", text: "Powered by", color: "#666666", fontSize: "7dp", marginTop: "5dp", fontWeight: "400" },
                                        { type: "Text", text: "Gemini", color: "#999999", fontSize: "8dp", marginTop: "1dp", fontWeight: "500" }
                                    ]}
                                ]
                            }
                        ]
                    },

                    // ── CONTENIDO: Sequence con snap:start ──────────────────
                    // El D-pad se detiene en cada item del Sequence.
                    // snap:"start" = al presionar abajo, avanza al siguiente item y lo alinea al tope.
                    {
                        type: "Sequence",
                        id: "mainSeq",
                        style: "sequenceStyle",
                        width: "100%",
                        grow: 1,
                        scrollDirection: "vertical",
                        snap: "start",
                        backgroundColor: c.content,
                        numbered: false,
                        items: [

                            // 1. Texto superior (resumen)
                            {
                                type: "Container",
                                width: "100%",
                                when: "${!!(templateData.textoSuperior) && templateData.textoSuperior != '' && !templateData.soloImagenes}",
                                paddingLeft: "20dp", paddingRight: "20dp",
                                paddingTop: "18dp", paddingBottom: "14dp",
                                backgroundColor: c.content,
                                items: [
                                    { type: "Text", text: "${templateData.textoSuperior}", color: c.textMain,
                                      fontSize: "20dp", textAlign: "center", lineHeight: 1.4 }
                                ]
                            },

                            // 2. Logo dinámico Wolfram — solo sobre el primer pod, cuando hay resultados
                            {
                                type: "Container",
                                width: "100%",
                                when: "${templateData.fuenteWolfram && templateData.imagenes && templateData.imagenes.length > 0 && !templateData.soloImagenes}",
                                alignItems: "center",
                                paddingTop: "10dp",
                                paddingBottom: "4dp",
                                backgroundColor: c.content,
                                items: [
                                    { type: "Image", source: "https://alexa-profesor-universal-cache-us-east-1.s3.us-east-1.amazonaws.com/logos/wolfram_dinamico.png",
                                      width: "160dp", height: "36dp", scale: "best-fit", align: "center" }
                                ]
                            },

                            // 3. Pods de Wolfram — cada pod es un item del Sequence
                            //    data-binding genera un item por pod automáticamente
                            {
                                type: "Container",
                                width: "100%",
                                data: "${templateData.imagenes || []}",
                                numbered: false,
                                items: [
                                    {
                                        type: "Container",
                                        width: "100%",
                                        paddingLeft: "12dp", paddingRight: "12dp",
                                        paddingTop: "10dp", paddingBottom: "10dp",
                                        backgroundColor: c.content,
                                        alignItems: "center",
                                        items: [
                                            { type: "Text", text: "${data.titulo}", color: c.textTitle,
                                              fontSize: "16dp", fontWeight: "bold", textAlign: "center", marginBottom: "8dp" },
                                            {
                                                type: "Frame",
                                                backgroundColor: c.card,
                                                borderRadius: "8dp", padding: "4dp",
                                                borderWidth: "1dp", borderColor: c.border,
                                                width: "${data.width < 350 ? data.width + 'dp' : zl + 'vw'}",
                                                height: "${data.width < 350 ? data.height + 'dp' : (zl * data.height / data.width) + 'vw'}",
                                                item: { type: "Image", source: "${data.url}", width: "100%", height: "100%", scale: "best-fit", align: "center" }
                                            }
                                        ]
                                    }
                                ]
                            },

                            // 4. Badge Wikipedia (ANTES de los botones)
                            {
                                type: "Container",
                                direction: "row",
                                justifyContent: "center",
                                alignItems: "center",
                                width: "100%",
                                paddingTop: "8dp", paddingBottom: "8dp",
                                backgroundColor: c.content,
                                when: "${templateData.fuenteWikipedia && !templateData.soloImagenes}",
                                items: [
                                    { type: "Image", source: "https://upload.wikimedia.org/wikipedia/commons/6/63/Wikipedia-logo.png", width: "26dp", height: "26dp", scale: "best-fit" },
                                    { type: "Text", text: " Wikipedia", color: "#FFFFFF", fontSize: "13dp", fontWeight: "bold", paddingLeft: "4dp" }
                                ]
                            },

                            // 5. Botón "Iniciar paso a paso"
                            {
                                type: "Container",
                                width: "100%",
                                when: "${templateData.canStepByStep && !templateData.masPasosDisponibles && !templateData.soloImagenes}",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingTop: "12dp",
                                paddingBottom: "12dp",
                                items: [
                                    {
                                        type: "TouchWrapper",
                                        id: "btnStepByStep",
                                        focusable: true,
                                        onPress: { type: "SendEvent", arguments: ["StepByStep", "${templateData.keyword}"] },
                                        onFocus: { type: "SetValue", componentId: "btnStepByStep_frame", property: "backgroundColor", value: "#00FF88" },
                                        onBlur:  { type: "SetValue", componentId: "btnStepByStep_frame", property: "backgroundColor", value: "#00E676" },
                                        item: {
                                            type: "Frame",
                                            id: "btnStepByStep_frame",
                                            backgroundColor: "#00E676",
                                            borderRadius: "24dp",
                                            borderWidth: "3dp",
                                            borderColor: "#FFFFFF",
                                            paddingTop: "16dp", paddingBottom: "16dp",
                                            paddingLeft: "32dp", paddingRight: "32dp",
                                            alignItems: "center",
                                            items: [
                                                { type: "Text", text: "▶️  Iniciar Solucion Paso a Paso", color: "#000000", fontSize: "20dp", fontWeight: "bold", textAlign: "center" },
                                                { type: "Text", text: "Toca aqui o di: modo wolfram", color: "#1A5C2A", fontSize: "12dp", textAlign: "center", marginTop: "4dp" }
                                            ]
                                        }
                                    }
                                ]
                            },

                            // 6. Botón "Ver siguientes pasos"
                            {
                                type: "Container",
                                width: "100%",
                                when: "${templateData.masPasosDisponibles}",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingTop: "12dp",
                                paddingBottom: "12dp",
                                items: [
                                    {
                                        type: "TouchWrapper",
                                        id: "btnContinue",
                                        focusable: true,
                                        onPress: { type: "SendEvent", arguments: ["ContinueWolfram"] },
                                        onFocus: { type: "SetValue", componentId: "btnContinue_frame", property: "backgroundColor", value: "#66DFFF" },
                                        onBlur:  { type: "SetValue", componentId: "btnContinue_frame", property: "backgroundColor", value: "#00CAFF" },
                                        item: {
                                            type: "Frame",
                                            id: "btnContinue_frame",
                                            backgroundColor: "#00CAFF",
                                            borderRadius: "24dp",
                                            borderWidth: "3dp",
                                            borderColor: "#FFFFFF",
                                            paddingTop: "16dp", paddingBottom: "16dp",
                                            paddingLeft: "32dp", paddingRight: "32dp",
                                            alignItems: "center",
                                            items: [
                                                { type: "Text", text: "⏭️  Ver Siguientes Pasos", color: "#000000", fontSize: "20dp", fontWeight: "bold", textAlign: "center" },
                                                { type: "Text", text: "Toca aqui o di: continua", color: "#004466", fontSize: "12dp", textAlign: "center", marginTop: "4dp" }
                                            ]
                                        }
                                    }
                                ]
                            },

                            // 7. Botón "Ir al resultado final"
                            {
                                type: "Container",
                                width: "100%",
                                when: "${templateData.masPasosDisponibles}",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingTop: "12dp",
                                paddingBottom: "12dp",
                                items: [
                                    {
                                        type: "TouchWrapper",
                                        id: "btnSkipToResult",
                                        focusable: true,
                                        onPress: { type: "SendEvent", arguments: ["SkipToResult"] },
                                        onFocus: { type: "SetValue", componentId: "btnSkipToResult_frame", property: "backgroundColor", value: "#FFB366" },
                                        onBlur:  { type: "SetValue", componentId: "btnSkipToResult_frame", property: "backgroundColor", value: "#FF9933" },
                                        item: {
                                            type: "Frame",
                                            id: "btnSkipToResult_frame",
                                            backgroundColor: "#FF9933",
                                            borderRadius: "24dp",
                                            borderWidth: "3dp",
                                            borderColor: "#FFFFFF",
                                            paddingTop: "16dp", paddingBottom: "16dp",
                                            paddingLeft: "32dp", paddingRight: "32dp",
                                            alignItems: "center",
                                            items: [
                                                { type: "Text", text: "⏩  Ir al Resultado Final", color: "#000000", fontSize: "20dp", fontWeight: "bold", textAlign: "center" },
                                                { type: "Text", text: "Toca aqui o di: ir al resultado", color: "#663300", fontSize: "12dp", textAlign: "center", marginTop: "4dp" }
                                            ]
                                }
                                    }
                                ]
                            },

                            // 8. Texto inferior (dato curioso)
                            {
                                type: "Container",
                                width: "100%",
                                when: "${templateData.textoInferior && templateData.textoInferior != '' && !templateData.soloImagenes}",
                                paddingLeft: "20dp", paddingRight: "20dp",
                                paddingTop: "14dp", paddingBottom: "14dp",
                                backgroundColor: c.content,
                                items: [
                                    { type: "Text", text: "${templateData.textoInferior}", color: c.textSub,
                                      fontSize: "17dp", fontStyle: "italic", textAlign: "center", lineHeight: 1.4 }
                                ]
                            },

                            // 9. Imágenes extra (NASA / Wikimedia) — solo si NO hay pods Wolfram, modo normal
                            {
                                type: "Container",
                                width: "100%",
                                data: "${templateData.imagenesExtra || []}",
                                numbered: false,
                                when: "${templateData.imagenesExtra && templateData.imagenesExtra.length > 0 && !(templateData.imagenes && templateData.imagenes.length > 0) && !templateData.soloImagenes}",
                                items: [
                                    {
                                        type: "Container",
                                        width: "100%",
                                        paddingLeft: "12dp", paddingRight: "12dp",
                                        paddingTop: "10dp", paddingBottom: "10dp",
                                        backgroundColor: c.content,
                                        alignItems: "center",
                                        items: [
                                            { type: "Text", text: "${data.titulo}", color: c.textTitle,
                                              fontSize: "14dp", fontWeight: "bold", textAlign: "center", marginBottom: "6dp" },
                                            {
                                                type: "Frame",
                                                backgroundColor: c.card,
                                                borderRadius: "8dp", padding: "4dp",
                                                borderWidth: "1dp", borderColor: c.border,
                                                width: "${zl + 'vw'}",
                                                height: "${(zl * data.height / (data.width || 800)) + 'vw'}",
                                                item: { type: "Image", source: "${data.url}", width: "100%", height: "100%", scale: "best-fit", align: "center" }
                                            }
                                        ]
                                    }
                                ]
                            },

                            // 10. Pantalla "Ver más imágenes" — solo título + logos + grid de imágenes
                            {
                                type: "Container",
                                width: "100%",
                                data: "${templateData.imagenesExtra || []}",
                                numbered: false,
                                display: "${templateData.soloImagenes && templateData.imagenesExtra && templateData.imagenesExtra.length > 0 ? 'normal' : 'none'}",
                                items: [
                                    {
                                        type: "Container",
                                        width: "100%",
                                        paddingLeft: "12dp", paddingRight: "12dp",
                                        paddingTop: "10dp", paddingBottom: "10dp",
                                        backgroundColor: c.content,
                                        alignItems: "center",
                                        items: [
                                            { type: "Text", text: "${data.titulo}", color: c.textTitle,
                                              fontSize: "15dp", fontWeight: "bold", textAlign: "center", marginBottom: "8dp" },
                                            {
                                                type: "Frame",
                                                backgroundColor: c.card,
                                                borderRadius: "10dp", padding: "4dp",
                                                borderWidth: "1dp", borderColor: c.border,
                                                width: "${zl + 'vw'}",
                                                height: "${(zl * data.height / (data.width || 800)) + 'vw'}",
                                                item: { type: "Image", source: "${data.url}", width: "100%", height: "100%", scale: "best-fit", align: "center" }
                                            }
                                        ]
                                    }
                                ]
                            },

                            // 11. Botón "Ver más imágenes"
                            {
                                type: "Container",
                                width: "100%",
                                when: "${templateData.hayMasImagenes}",
                                alignItems: "center",
                                justifyContent: "center",
                                paddingTop: "12dp",
                                paddingBottom: "12dp",
                                items: [
                                    {
                                        type: "TouchWrapper",
                                        id: "btnVerMasImg",
                                        focusable: true,
                                        onPress: { type: "SendEvent", arguments: ["verMasImagenes"] },
                                        onFocus: { type: "SetValue", componentId: "btnVerMasImg_frame", property: "backgroundColor", value: "#5588FF" },
                                        onBlur:  { type: "SetValue", componentId: "btnVerMasImg_frame", property: "backgroundColor", value: "#3366CC" },
                                        item: {
                                            type: "Frame",
                                            id: "btnVerMasImg_frame",
                                            backgroundColor: "#3366CC",
                                            borderRadius: "24dp",
                                            borderWidth: "3dp",
                                            borderColor: "#AACCFF",
                                            paddingTop: "14dp", paddingBottom: "14dp",
                                            paddingLeft: "32dp", paddingRight: "32dp",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            items: [
                                                { type: "Text", text: "🖼️  Ver mas imagenes", color: "#FFFFFF", fontSize: "18dp", fontWeight: "bold", textAlign: "center" },
                                                { type: "Text", text: "Toca aqui o di: ver mas imagenes", color: "#AACCFF", fontSize: "11dp", textAlign: "center", marginTop: "4dp" }
                                            ]
                                        }
                                    }
                                ]
                            },

                            // 10. Espaciador final para que el último item no quede pegado a los controles
                            { type: "Container", width: "100%", height: "20dp", backgroundColor: c.content }
                        ]
                    },

                    // ── BARRA DE CONTROLES D-PAD ─────────────────────────────
                    // Fija en la parte inferior. El D-pad puede navegar hasta aquí
                    // y seleccionar cada botón con el centro del control.
                    {
                        type: "Container",
                        direction: "row",
                        width: "100%",
                        justifyContent: "center",
                        alignItems: "center",
                        backgroundColor: c.header,
                        paddingTop: "6dp",
                        paddingBottom: "6dp",
                        spacing: "10dp",
                        items: [
                            ctrlBtn("－", "Alejar",   ["zoomOut"],        c.zoomMinus),
                            ctrlBtn("＋", "Acercar",  ["zoomIn"],         c.zoomPlus),
                            ctrlBtn("◐",  "Modo",     ["toggleDarkMode"], c.modeBg),
                            ctrlBtn("🤫", "Susurro",  ["toggleWhisper"],  c.whisperBg)
                        ]
                    },

                    // ── FOOTER ───────────────────────────────────────────────
                    {
                        type: "Container",
                        direction: "row",
                        alignItems: "center",
                        width: "100%",
                        height: "26dp",
                        paddingLeft: "10dp",
                        paddingRight: "10dp",
                        backgroundColor: c.footer,
                        items: [
                            { type: "Text", text: "Claude 4.5 Haiku · Wolfram Alpha · Wikipedia · Gemini 3.1 Flash-Lite",
                              color: "#888888", fontSize: "9dp", grow: 1 }
                        ]
                    }
                ]
            }
        }
    };
}

module.exports = { generarAPL };
  
