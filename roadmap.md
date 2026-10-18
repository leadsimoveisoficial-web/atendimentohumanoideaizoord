# Roadmap

- [x] Rádio gratuita: cinco estações reproduzidas no navegador, ritmo pelo áudio e pausa zerando movimento; comandos e tchau com testes.
- [ ] Validar pedidos musicais e tchau por microfone real — requer aparelho com voz/escuta disponíveis.

- [x] Remover linha azul da boca e encaixar a abertura nos lábios originais.

- [x] Corrigir encaixe da boca e pausas da voz gratuita; conferido com reprodução medida
- [x] Corrigir rotação das pernas ao apresentar Hot Roll; pernas sem rotação/translação durante teste com áudio

- [x] Voz grátis: free-speech, free-listen, menu-script, Groq server; LiveZoord reescrito; AskZoord fallback
- [x] Apresentação grátis do cardápio validada (roteiro local com preços reais)
- [x] GROQ_API_KEY salva pelo usuário (formato gsk_); valor ainda não propagou ao servidor local — validar quando propagar/publicar
- [x] Grok (xAI) integrado: cérebro grok-4.7 (/v1/responses) e voz /api/zoord-voice com boca dirigida por áudio real
- [x] Cadeia de reserva automática: gateway → Grok → Groq → grátis; conexão presa >12s cai para o modo grátis
- [x] Browser: chip "Voz grátis do navegador ativa" aparece, palco sem erros
- [x] Build OK
- [ ] Conta xAI sem créditos (403): quando o usuário recarregar créditos na xAI, voz e cérebro Grok ativam sozinhos
- [ ] Validar voz/escuta grátis em aparelho real (microfone e vozes do navegador)
