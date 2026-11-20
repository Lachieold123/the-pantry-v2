npm notice run the-pantry-v2@1.0.0 npx
npm notice run 'tsx' docs/audits/2026-11-20-deep-audit/tools/L5/contrast.ts
| Theme | Fore | Back | Kind | Ratio | Result | Where |
|---|---|---|---|---|---|---|
| light | inkMuted `#6E6E6E` | bgSoft `#F7F7F7` | text | 4.76 | pass | Segmented unselected, search placeholder, chips (Segmented.tsx:36, SearchField) |
| light | inkMuted `#6E6E6E` | accentSoft `#FBEDD6` | text | 4.42 | **FAIL** | meta on amber wash (CupboardSummary, PlanChoice caption) |
| light | inkMuted `#6E6E6E` | raised `#FFFFFF` | text | 5.10 | pass | tour card meta |
| light | inkMuted `#6E6E6E` | tintNeutral `#F4F4F4` | text | 4.64 | pass | meta on neutral tile |
| light | accentText `#8F6232` | tintButter `#FFF3CC` | text | 4.78 | pass | amber kicker on tile |
| light | accentDeep `#8F6232` | bgSoft `#F7F7F7` | text | 4.95 | pass | cupboard action disabled (CupboardSummary.tsx:88) / timer chip |
| light | accentDeep `#8F6232` | bg `#FFFFFF` | text | 5.30 | pass | timer chip text (CookStep.tsx:45) |
| light | inkSubtle `#BCBCBC` | bg `#FFFFFF` | text | 1.90 | **FAIL** | Cook Back (first step) label, Surprise counter slash (CookFooter.tsx:27, SurpriseParts.tsx:31) |
| light | inkSubtle `#BCBCBC` | bg `#FFFFFF` | large | 1.90 | **FAIL** | Cook step numeral (CookStep.tsx:26) - decorative, hidden from a11y |
| light | inkMuted `#6E6E6E` | bg `#FFFFFF` | ui | 5.10 | pass | inactive tab icon/label (TabBar.tsx:78) |
| light | border `rgba(0,0,0,0.06)` | bg `#FFFFFF` | ui | 1.14 | **FAIL** | every 1pt border/divider/progress track |
| light | border `rgba(0,0,0,0.06)` | bgSoft `#F7F7F7` | ui | 1.14 | **FAIL** | border on soft fill |
| light | border `rgba(0,0,0,0.06)` | card `#FFFFFF` | ui | 1.14 | **FAIL** | card edge |
| light | inkSubtle `#BCBCBC` | bg `#FFFFFF` | ui | 1.90 | **FAIL** | Toggle off track (Toggle.tsx:22,24), DaySlots empty-slot border (DaySlots.tsx:217), Post photo box (PostScreen.tsx:265), sheet handle |
| light | inkSubtle `#BCBCBC` | card `#FFFFFF` | ui | 1.90 | **FAIL** | sheet handle on card (Sheet.tsx:60, ModalSheet.tsx:79) |
| light | accent `#C99155` | bg `#FFFFFF` | ui | 2.74 | **FAIL** | Toggle on track, progress fill, accent dots |
| light | accent `#C99155` | bg `#FFFFFF` | text | 2.74 | **FAIL** | Icon colour="accent" (RecipeCard.tsx:84 on photo disc) / known failure |
| light | bullet `#F5B945` | bg `#FFFFFF` | ui | 1.76 | **FAIL** | ingredient bullet dot |
| light | raisedEdge `rgba(0,0,0,0)` | bg `#FFFFFF` | ui | 1.00 | **FAIL** | tour card edge |
| light-HC | inkMuted `#363636` | bgSoft `#F0F0F0` | text | 10.60 | pass | Segmented unselected, search placeholder, chips (Segmented.tsx:36, SearchField) |
| light-HC | inkMuted `#363636` | accentSoft `#FBEDD6` | text | 10.47 | pass | meta on amber wash (CupboardSummary, PlanChoice caption) |
| light-HC | inkMuted `#363636` | raised `#FFFFFF` | text | 12.08 | pass | tour card meta |
| light-HC | inkMuted `#363636` | tintNeutral `#F4F4F4` | text | 10.99 | pass | meta on neutral tile |
| light-HC | accentText `#6E4A1C` | tintButter `#FFF3CC` | text | 7.12 | pass | amber kicker on tile |
| light-HC | accentDeep `#6E4A1C` | bgSoft `#F0F0F0` | text | 6.93 | pass | cupboard action disabled (CupboardSummary.tsx:88) / timer chip |
| light-HC | accentDeep `#6E4A1C` | bg `#FFFFFF` | text | 7.90 | pass | timer chip text (CookStep.tsx:45) |
| light-HC | inkSubtle `#595959` | bg `#FFFFFF` | text | 7.00 | pass | Cook Back (first step) label, Surprise counter slash (CookFooter.tsx:27, SurpriseParts.tsx:31) |
| light-HC | inkSubtle `#595959` | bg `#FFFFFF` | large | 7.00 | pass | Cook step numeral (CookStep.tsx:26) - decorative, hidden from a11y |
| light-HC | inkMuted `#363636` | bg `#FFFFFF` | ui | 12.08 | pass | inactive tab icon/label (TabBar.tsx:78) |
| light-HC | border `rgba(0,0,0,0.55)` | bg `#FFFFFF` | ui | 4.76 | pass | every 1pt border/divider/progress track |
| light-HC | border `rgba(0,0,0,0.55)` | bgSoft `#F0F0F0` | ui | 4.61 | pass | border on soft fill |
| light-HC | border `rgba(0,0,0,0.55)` | card `#FFFFFF` | ui | 4.76 | pass | card edge |
| light-HC | inkSubtle `#595959` | bg `#FFFFFF` | ui | 7.00 | pass | Toggle off track (Toggle.tsx:22,24), DaySlots empty-slot border (DaySlots.tsx:217), Post photo box (PostScreen.tsx:265), sheet handle |
| light-HC | inkSubtle `#595959` | card `#FFFFFF` | ui | 7.00 | pass | sheet handle on card (Sheet.tsx:60, ModalSheet.tsx:79) |
| light-HC | accent `#8A5A22` | bg `#FFFFFF` | ui | 5.89 | pass | Toggle on track, progress fill, accent dots |
| light-HC | accent `#8A5A22` | bg `#FFFFFF` | text | 5.89 | pass | Icon colour="accent" (RecipeCard.tsx:84 on photo disc) / known failure |
| light-HC | bullet `#F5B945` | bg `#FFFFFF` | ui | 1.76 | **FAIL** | ingredient bullet dot |
| light-HC | raisedEdge `rgba(0,0,0,0.55)` | bg `#FFFFFF` | ui | 4.76 | pass | tour card edge |
| light | LIBRARY.count `#A0712F` | bg `#FFFFFF` | text | 4.29 | **FAIL** | italic "4 recipes" count, 15pt (countLibrary) |
| light | LIBRARY.meta `rgba(20,18,16,0.62)` | LIBRARY.card `#F7F3EA` | text | 5.05 | pass | card time/difficulty |
| light | LIBRARY.title `#0E0E0E` | LIBRARY.card `#F7F3EA` | text | 17.43 | pass | card title |
| light | LIBRARY.wellIcon `#7A7266` | LIBRARY.well `#ECE6DA` | ui | 3.82 | pass | no-photo icon |
| light | LIBRARY.card `#F7F3EA` | bg `#FFFFFF` | ui | 1.11 | **FAIL** | card edge vs page (no border?) |
| light | cat.proteins.bold `#973023` | tint `#FFDBD2` | text | 5.91 | pass | jar initial / x |
| light | PANTRY_CHIP_INK `#2A2218` | cat.proteins.tint `#FFDBD2` | text | 12.17 | pass | jar chip label |
| light | cat.proteins.soft `#D37D6F` | bg `#FFFFFF` | ui | 3.03 | pass | jar line colour |
| light | cat.vegetables.bold `#006C28` | tint `#CFF3D5` | text | 5.49 | pass | jar initial / x |
| light | PANTRY_CHIP_INK `#2A2218` | cat.vegetables.tint `#CFF3D5` | text | 13.01 | pass | jar chip label |
| light | cat.vegetables.soft `#63AB74` | bg `#FFFFFF` | ui | 2.76 | **FAIL** | jar line colour |
| light | cat.fruit.bold `#7B4E00` | tint `#F9E6BF` | text | 5.83 | pass | jar initial / x |
| light | PANTRY_CHIP_INK `#2A2218` | cat.fruit.tint `#F9E6BF` | text | 12.76 | pass | jar chip label |
| light | cat.fruit.soft `#B7933F` | bg `#FFFFFF` | ui | 2.89 | **FAIL** | jar line colour |
| light | cat.sauces.bold `#923900` | tint `#FFDEC8` | text | 5.89 | pass | jar initial / x |
| light | PANTRY_CHIP_INK `#2A2218` | cat.sauces.tint `#FFDEC8` | text | 12.34 | pass | jar chip label |
| light | cat.sauces.soft `#CF8358` | bg `#FFFFFF` | ui | 2.98 | **FAIL** | jar line colour |
| light | cat.pantry.bold `#814A00` | tint `#FDE4BF` | text | 5.85 | pass | jar initial / x |
| light | PANTRY_CHIP_INK `#2A2218` | cat.pantry.tint `#FDE4BF` | text | 12.70 | pass | jar chip label |
| light | cat.pantry.soft `#BD8F41` | bg `#FFFFFF` | ui | 2.93 | **FAIL** | jar line colour |
| light | cat.dairy.bold `#715400` | tint `#F3E8BF` | text | 5.76 | pass | jar initial / x |
| light | PANTRY_CHIP_INK `#2A2218` | cat.dairy.tint `#F3E8BF` | text | 12.76 | pass | jar chip label |
| light | cat.dairy.soft `#AE9740` | bg `#FFFFFF` | ui | 2.88 | **FAIL** | jar line colour |
| light | cat.herbs.bold `#316800` | tint `#D8F1CC` | text | 5.59 | pass | jar initial / x |
| light | PANTRY_CHIP_INK `#2A2218` | cat.herbs.tint `#D8F1CC` | text | 12.96 | pass | jar chip label |
| light | cat.herbs.soft `#7AA761` | bg `#FFFFFF` | ui | 2.79 | **FAIL** | jar line colour |
| light | cat.other.bold `#8D3E00` | tint `#FFE0C4` | text | 5.92 | pass | jar initial / x |
| light | PANTRY_CHIP_INK `#2A2218` | cat.other.tint `#FFE0C4` | text | 12.47 | pass | jar chip label |
| light | cat.other.soft `#CA874E` | bg `#FFFFFF` | ui | 2.96 | **FAIL** | jar line colour |
| dark | inkMuted `#9C968C` | bgSoft `#141414` | text | 6.28 | pass | Segmented unselected, search placeholder, chips (Segmented.tsx:36, SearchField) |
| dark | inkMuted `#9C968C` | accentSoft `#3D2C13` | text | 4.56 | pass | meta on amber wash (CupboardSummary, PlanChoice caption) |
| dark | inkMuted `#9C968C` | raised `#1F1D1A` | text | 5.73 | pass | tour card meta |
| dark | inkMuted `#9C968C` | tintNeutral `#1F1F1F` | text | 5.62 | pass | meta on neutral tile |
| dark | accentText `#E0AC6E` | tintButter `#3A2F18` | text | 6.44 | pass | amber kicker on tile |
| dark | accentDeep `#C99155` | bgSoft `#141414` | text | 6.72 | pass | cupboard action disabled (CupboardSummary.tsx:88) / timer chip |
| dark | accentDeep `#C99155` | bg `#0A0A0A` | text | 7.23 | pass | timer chip text (CookStep.tsx:45) |
| dark | inkSubtle `#48484A` | bg `#0A0A0A` | text | 2.17 | **FAIL** | Cook Back (first step) label, Surprise counter slash (CookFooter.tsx:27, SurpriseParts.tsx:31) |
| dark | inkSubtle `#48484A` | bg `#0A0A0A` | large | 2.17 | **FAIL** | Cook step numeral (CookStep.tsx:26) - decorative, hidden from a11y |
| dark | inkMuted `#9C968C` | bg `#0A0A0A` | ui | 6.75 | pass | inactive tab icon/label (TabBar.tsx:78) |
| dark | border `rgba(255,255,255,0.10)` | bg `#0A0A0A` | ui | 1.25 | **FAIL** | every 1pt border/divider/progress track |
| dark | border `rgba(255,255,255,0.10)` | bgSoft `#141414` | ui | 1.31 | **FAIL** | border on soft fill |
| dark | border `rgba(255,255,255,0.10)` | card `#141414` | ui | 1.31 | **FAIL** | card edge |
| dark | inkSubtle `#48484A` | bg `#0A0A0A` | ui | 2.17 | **FAIL** | Toggle off track (Toggle.tsx:22,24), DaySlots empty-slot border (DaySlots.tsx:217), Post photo box (PostScreen.tsx:265), sheet handle |
| dark | inkSubtle `#48484A` | card `#141414` | ui | 2.02 | **FAIL** | sheet handle on card (Sheet.tsx:60, ModalSheet.tsx:79) |
| dark | accent `#E0AC6E` | bg `#0A0A0A` | ui | 9.71 | pass | Toggle on track, progress fill, accent dots |
| dark | accent `#E0AC6E` | bg `#0A0A0A` | text | 9.71 | pass | Icon colour="accent" (RecipeCard.tsx:84 on photo disc) / known failure |
| dark | bullet `#F5B945` | bg `#0A0A0A` | ui | 11.23 | pass | ingredient bullet dot |
| dark | raisedEdge `rgba(247,243,234,0.22)` | bg `#0A0A0A` | ui | 1.83 | **FAIL** | tour card edge |
| dark-HC | inkMuted `#C8C8C8` | bgSoft `#101010` | text | 11.37 | pass | Segmented unselected, search placeholder, chips (Segmented.tsx:36, SearchField) |
| dark-HC | inkMuted `#C8C8C8` | accentSoft `#3D2C13` | text | 8.00 | pass | meta on amber wash (CupboardSummary, PlanChoice caption) |
| dark-HC | inkMuted `#C8C8C8` | raised `#161616` | text | 10.82 | pass | tour card meta |
| dark-HC | inkMuted `#C8C8C8` | tintNeutral `#1F1F1F` | text | 9.85 | pass | meta on neutral tile |
| dark-HC | accentText `#F0C081` | tintButter `#3A2F18` | text | 7.85 | pass | amber kicker on tile |
| dark-HC | accentDeep `#E0AC6E` | bgSoft `#101010` | text | 9.33 | pass | cupboard action disabled (CupboardSummary.tsx:88) / timer chip |
| dark-HC | accentDeep `#E0AC6E` | bg `#000000` | text | 10.30 | pass | timer chip text (CookStep.tsx:45) |
| dark-HC | inkSubtle `#9A9A9A` | bg `#000000` | text | 7.46 | pass | Cook Back (first step) label, Surprise counter slash (CookFooter.tsx:27, SurpriseParts.tsx:31) |
| dark-HC | inkSubtle `#9A9A9A` | bg `#000000` | large | 7.46 | pass | Cook step numeral (CookStep.tsx:26) - decorative, hidden from a11y |
| dark-HC | inkMuted `#C8C8C8` | bg `#000000` | ui | 12.55 | pass | inactive tab icon/label (TabBar.tsx:78) |
| dark-HC | border `rgba(255,255,255,0.6)` | bg `#000000` | ui | 7.37 | pass | every 1pt border/divider/progress track |
| dark-HC | border `rgba(255,255,255,0.6)` | bgSoft `#101010` | ui | 7.22 | pass | border on soft fill |
| dark-HC | border `rgba(255,255,255,0.6)` | card `#000000` | ui | 7.37 | pass | card edge |
| dark-HC | inkSubtle `#9A9A9A` | bg `#000000` | ui | 7.46 | pass | Toggle off track (Toggle.tsx:22,24), DaySlots empty-slot border (DaySlots.tsx:217), Post photo box (PostScreen.tsx:265), sheet handle |
| dark-HC | inkSubtle `#9A9A9A` | card `#000000` | ui | 7.46 | pass | sheet handle on card (Sheet.tsx:60, ModalSheet.tsx:79) |
| dark-HC | accent `#F0C081` | bg `#000000` | ui | 12.56 | pass | Toggle on track, progress fill, accent dots |
| dark-HC | accent `#F0C081` | bg `#000000` | text | 12.56 | pass | Icon colour="accent" (RecipeCard.tsx:84 on photo disc) / known failure |
| dark-HC | bullet `#F5B945` | bg `#000000` | ui | 11.91 | pass | ingredient bullet dot |
| dark-HC | raisedEdge `rgba(255,255,255,0.6)` | bg `#000000` | ui | 7.37 | pass | tour card edge |
| dark | LIBRARY.count `#E8C891` | bg `#0A0A0A` | text | 12.35 | pass | italic "4 recipes" count, 15pt (countLibrary) |
| dark | LIBRARY.meta `rgba(247,243,234,0.62)` | LIBRARY.card `#1C1915` | text | 6.73 | pass | card time/difficulty |
| dark | LIBRARY.title `#F7F3EA` | LIBRARY.card `#1C1915` | text | 15.81 | pass | card title |
| dark | LIBRARY.wellIcon `#6A6258` | LIBRARY.well `#26221D` | ui | 2.63 | **FAIL** | no-photo icon |
| dark | LIBRARY.card `#1C1915` | bg `#0A0A0A` | ui | 1.13 | **FAIL** | card edge vs page (no border?) |
| dark | cat.proteins.bold `#F0A393` | tint `#3A2320` | text | 7.19 | pass | jar initial / x |
| dark | PANTRY_CHIP_INK `#EDE6DA` | cat.proteins.tint `#3A2320` | text | 11.75 | pass | jar chip label |
| dark | cat.proteins.soft `#7A4238` | bg `#0A0A0A` | ui | 2.51 | **FAIL** | jar line colour |
| dark | cat.vegetables.bold `#8FD6A0` | tint `#1E3324` | text | 7.91 | pass | jar initial / x |
| dark | PANTRY_CHIP_INK `#EDE6DA` | cat.vegetables.tint `#1E3324` | text | 10.89 | pass | jar chip label |
| dark | cat.vegetables.soft `#3F6E4B` | bg `#0A0A0A` | ui | 3.34 | pass | jar line colour |
| dark | cat.fruit.bold `#E7C67A` | tint `#372D17` | text | 8.23 | pass | jar initial / x |
| dark | PANTRY_CHIP_INK `#EDE6DA` | cat.fruit.tint `#372D17` | text | 10.92 | pass | jar chip label |
| dark | cat.fruit.soft `#7A6330` | bg `#0A0A0A` | ui | 3.45 | pass | jar line colour |
| dark | cat.sauces.bold `#F2AE82` | tint `#3A2618` | text | 7.58 | pass | jar initial / x |
| dark | PANTRY_CHIP_INK `#EDE6DA` | cat.sauces.tint `#3A2618` | text | 11.52 | pass | jar chip label |
| dark | cat.sauces.soft `#7C4F33` | bg `#0A0A0A` | ui | 2.85 | **FAIL** | jar line colour |
| dark | cat.pantry.bold `#E9C286` | tint `#362A18` | text | 8.34 | pass | jar initial / x |
| dark | PANTRY_CHIP_INK `#EDE6DA` | cat.pantry.tint `#362A18` | text | 11.28 | pass | jar chip label |
| dark | cat.pantry.soft `#7A5E32` | bg `#0A0A0A` | ui | 3.28 | pass | jar line colour |
| dark | cat.dairy.bold `#E2CF83` | tint `#332E18` | text | 8.73 | pass | jar initial / x |
| dark | PANTRY_CHIP_INK `#EDE6DA` | cat.dairy.tint `#332E18` | text | 10.96 | pass | jar chip label |
| dark | cat.dairy.soft `#6F6430` | bg `#0A0A0A` | ui | 3.34 | pass | jar line colour |
| dark | cat.herbs.bold `#A9D78F` | tint `#22321B` | text | 8.31 | pass | jar initial / x |
| dark | PANTRY_CHIP_INK `#EDE6DA` | cat.herbs.tint `#22321B` | text | 10.99 | pass | jar chip label |
| dark | cat.herbs.soft `#4E6E3D` | bg `#0A0A0A` | ui | 3.41 | pass | jar line colour |
| dark | cat.other.bold `#EFB585` | tint `#38281A` | text | 7.82 | pass | jar initial / x |
| dark | PANTRY_CHIP_INK `#EDE6DA` | cat.other.tint `#38281A` | text | 11.39 | pass | jar chip label |
| dark | cat.other.soft `#7A5536` | bg `#0A0A0A` | ui | 3.00 | **FAIL** | jar line colour |
| both | onPhoto `#FFFFFF` | heroBottom at end stop on white photo `#383838` | text | 11.73 | pass | text on photo (best case: the end stop) |
| both | onPhotoMuted `rgba(255,255,255,0.85)` | heroBottom at end stop on white photo `#383838` | text | 8.98 | pass | text on photo (best case: the end stop) |
| both | onPhotoFaint `rgba(255,255,255,0.75)` | heroBottom at end stop on white photo `#383838` | text | 7.39 | pass | text on photo (best case: the end stop) |
| both | videoSub `rgba(255,255,255,0.7)` | heroBottom at end stop on white photo `#383838` | text | 6.67 | pass | text on photo (best case: the end stop) |
| both | videoQuiet `rgba(255,255,255,0.45)` | heroBottom at end stop on white photo `#383838` | text | 3.75 | **FAIL** | text on photo (best case: the end stop) |
| both | onPhoto `#FFFFFF` | shelfBottom at end stop on white photo `#404040` | text | 10.37 | pass | text on photo (best case: the end stop) |
| both | onPhotoMuted `rgba(255,255,255,0.85)` | shelfBottom at end stop on white photo `#404040` | text | 8.03 | pass | text on photo (best case: the end stop) |
| both | onPhotoFaint `rgba(255,255,255,0.75)` | shelfBottom at end stop on white photo `#404040` | text | 6.67 | pass | text on photo (best case: the end stop) |
| both | videoSub `rgba(255,255,255,0.7)` | shelfBottom at end stop on white photo `#404040` | text | 6.05 | pass | text on photo (best case: the end stop) |
| both | videoQuiet `rgba(255,255,255,0.45)` | shelfBottom at end stop on white photo `#404040` | text | 3.50 | **FAIL** | text on photo (best case: the end stop) |
| both | onPhoto `#FFFFFF` | feedBottom at end stop on white photo `#262626` | text | 15.13 | pass | text on photo (best case: the end stop) |
| both | onPhotoMuted `rgba(255,255,255,0.85)` | feedBottom at end stop on white photo `#262626` | text | 11.30 | pass | text on photo (best case: the end stop) |
| both | onPhotoFaint `rgba(255,255,255,0.75)` | feedBottom at end stop on white photo `#262626` | text | 9.12 | pass | text on photo (best case: the end stop) |
| both | videoSub `rgba(255,255,255,0.7)` | feedBottom at end stop on white photo `#262626` | text | 8.13 | pass | text on photo (best case: the end stop) |
| both | videoQuiet `rgba(255,255,255,0.45)` | feedBottom at end stop on white photo `#262626` | text | 4.25 | **FAIL** | text on photo (best case: the end stop) |
| both | onPhoto `#FFFFFF` | videoScrim50 at end stop on white photo `#808080` | text | 3.95 | **FAIL** | text on photo (best case: the end stop) |
| both | onPhotoMuted `rgba(255,255,255,0.85)` | videoScrim50 at end stop on white photo `#808080` | text | 3.34 | **FAIL** | text on photo (best case: the end stop) |
| both | onPhotoFaint `rgba(255,255,255,0.75)` | videoScrim50 at end stop on white photo `#808080` | text | 2.97 | **FAIL** | text on photo (best case: the end stop) |
| both | videoSub `rgba(255,255,255,0.7)` | videoScrim50 at end stop on white photo `#808080` | text | 2.80 | **FAIL** | text on photo (best case: the end stop) |
| both | videoQuiet `rgba(255,255,255,0.45)` | videoScrim50 at end stop on white photo `#808080` | text | 2.02 | **FAIL** | text on photo (best case: the end stop) |

FAILURES (43)

| light | inkMuted `#6E6E6E` | accentSoft `#FBEDD6` | text | 4.42 | **FAIL** | meta on amber wash (CupboardSummary, PlanChoice caption) |
| light | inkSubtle `#BCBCBC` | bg `#FFFFFF` | text | 1.90 | **FAIL** | Cook Back (first step) label, Surprise counter slash (CookFooter.tsx:27, SurpriseParts.tsx:31) |
| light | inkSubtle `#BCBCBC` | bg `#FFFFFF` | large | 1.90 | **FAIL** | Cook step numeral (CookStep.tsx:26) - decorative, hidden from a11y |
| light | border `rgba(0,0,0,0.06)` | bg `#FFFFFF` | ui | 1.14 | **FAIL** | every 1pt border/divider/progress track |
| light | border `rgba(0,0,0,0.06)` | bgSoft `#F7F7F7` | ui | 1.14 | **FAIL** | border on soft fill |
| light | border `rgba(0,0,0,0.06)` | card `#FFFFFF` | ui | 1.14 | **FAIL** | card edge |
| light | inkSubtle `#BCBCBC` | bg `#FFFFFF` | ui | 1.90 | **FAIL** | Toggle off track (Toggle.tsx:22,24), DaySlots empty-slot border (DaySlots.tsx:217), Post photo box (PostScreen.tsx:265), sheet handle |
| light | inkSubtle `#BCBCBC` | card `#FFFFFF` | ui | 1.90 | **FAIL** | sheet handle on card (Sheet.tsx:60, ModalSheet.tsx:79) |
| light | accent `#C99155` | bg `#FFFFFF` | ui | 2.74 | **FAIL** | Toggle on track, progress fill, accent dots |
| light | accent `#C99155` | bg `#FFFFFF` | text | 2.74 | **FAIL** | Icon colour="accent" (RecipeCard.tsx:84 on photo disc) / known failure |
| light | bullet `#F5B945` | bg `#FFFFFF` | ui | 1.76 | **FAIL** | ingredient bullet dot |
| light | raisedEdge `rgba(0,0,0,0)` | bg `#FFFFFF` | ui | 1.00 | **FAIL** | tour card edge |
| light-HC | bullet `#F5B945` | bg `#FFFFFF` | ui | 1.76 | **FAIL** | ingredient bullet dot |
| light | LIBRARY.count `#A0712F` | bg `#FFFFFF` | text | 4.29 | **FAIL** | italic "4 recipes" count, 15pt (countLibrary) |
| light | LIBRARY.card `#F7F3EA` | bg `#FFFFFF` | ui | 1.11 | **FAIL** | card edge vs page (no border?) |
| light | cat.vegetables.soft `#63AB74` | bg `#FFFFFF` | ui | 2.76 | **FAIL** | jar line colour |
| light | cat.fruit.soft `#B7933F` | bg `#FFFFFF` | ui | 2.89 | **FAIL** | jar line colour |
| light | cat.sauces.soft `#CF8358` | bg `#FFFFFF` | ui | 2.98 | **FAIL** | jar line colour |
| light | cat.pantry.soft `#BD8F41` | bg `#FFFFFF` | ui | 2.93 | **FAIL** | jar line colour |
| light | cat.dairy.soft `#AE9740` | bg `#FFFFFF` | ui | 2.88 | **FAIL** | jar line colour |
| light | cat.herbs.soft `#7AA761` | bg `#FFFFFF` | ui | 2.79 | **FAIL** | jar line colour |
| light | cat.other.soft `#CA874E` | bg `#FFFFFF` | ui | 2.96 | **FAIL** | jar line colour |
| dark | inkSubtle `#48484A` | bg `#0A0A0A` | text | 2.17 | **FAIL** | Cook Back (first step) label, Surprise counter slash (CookFooter.tsx:27, SurpriseParts.tsx:31) |
| dark | inkSubtle `#48484A` | bg `#0A0A0A` | large | 2.17 | **FAIL** | Cook step numeral (CookStep.tsx:26) - decorative, hidden from a11y |
| dark | border `rgba(255,255,255,0.10)` | bg `#0A0A0A` | ui | 1.25 | **FAIL** | every 1pt border/divider/progress track |
| dark | border `rgba(255,255,255,0.10)` | bgSoft `#141414` | ui | 1.31 | **FAIL** | border on soft fill |
| dark | border `rgba(255,255,255,0.10)` | card `#141414` | ui | 1.31 | **FAIL** | card edge |
| dark | inkSubtle `#48484A` | bg `#0A0A0A` | ui | 2.17 | **FAIL** | Toggle off track (Toggle.tsx:22,24), DaySlots empty-slot border (DaySlots.tsx:217), Post photo box (PostScreen.tsx:265), sheet handle |
| dark | inkSubtle `#48484A` | card `#141414` | ui | 2.02 | **FAIL** | sheet handle on card (Sheet.tsx:60, ModalSheet.tsx:79) |
| dark | raisedEdge `rgba(247,243,234,0.22)` | bg `#0A0A0A` | ui | 1.83 | **FAIL** | tour card edge |
| dark | LIBRARY.wellIcon `#6A6258` | LIBRARY.well `#26221D` | ui | 2.63 | **FAIL** | no-photo icon |
| dark | LIBRARY.card `#1C1915` | bg `#0A0A0A` | ui | 1.13 | **FAIL** | card edge vs page (no border?) |
| dark | cat.proteins.soft `#7A4238` | bg `#0A0A0A` | ui | 2.51 | **FAIL** | jar line colour |
| dark | cat.sauces.soft `#7C4F33` | bg `#0A0A0A` | ui | 2.85 | **FAIL** | jar line colour |
| dark | cat.other.soft `#7A5536` | bg `#0A0A0A` | ui | 3.00 | **FAIL** | jar line colour |
| both | videoQuiet `rgba(255,255,255,0.45)` | heroBottom at end stop on white photo `#383838` | text | 3.75 | **FAIL** | text on photo (best case: the end stop) |
| both | videoQuiet `rgba(255,255,255,0.45)` | shelfBottom at end stop on white photo `#404040` | text | 3.50 | **FAIL** | text on photo (best case: the end stop) |
| both | videoQuiet `rgba(255,255,255,0.45)` | feedBottom at end stop on white photo `#262626` | text | 4.25 | **FAIL** | text on photo (best case: the end stop) |
| both | onPhoto `#FFFFFF` | videoScrim50 at end stop on white photo `#808080` | text | 3.95 | **FAIL** | text on photo (best case: the end stop) |
| both | onPhotoMuted `rgba(255,255,255,0.85)` | videoScrim50 at end stop on white photo `#808080` | text | 3.34 | **FAIL** | text on photo (best case: the end stop) |
| both | onPhotoFaint `rgba(255,255,255,0.75)` | videoScrim50 at end stop on white photo `#808080` | text | 2.97 | **FAIL** | text on photo (best case: the end stop) |
| both | videoSub `rgba(255,255,255,0.7)` | videoScrim50 at end stop on white photo `#808080` | text | 2.80 | **FAIL** | text on photo (best case: the end stop) |
| both | videoQuiet `rgba(255,255,255,0.45)` | videoScrim50 at end stop on white photo `#808080` | text | 2.02 | **FAIL** | text on photo (best case: the end stop) |

SMALLEST PASSING CHANGE

| Token | Now | Needs | Smallest change |
|---|---|---|---|
| light border | `rgba(0,0,0,0.06)` on `#FFFFFF` | 3:1 | rgba(0,0,0,0.42) (or solid #949494) |
| dark border | `rgba(255,255,255,0.10)` on `#0A0A0A` | 3:1 | rgba(255,255,255,0.34) (or solid #5D5D5D) |
| light inkSubtle (track/handle/slot border) | `#BCBCBC` on `#FFFFFF` | 3:1 | #939393 (22% toward black) |
| dark inkSubtle (track/handle/slot border) | `#48484A` on `#141414` | 3:1 | #626263 (14% toward white) |
| light accent as a control fill | `#C99155` on `#FFFFFF` | 3:1 | #BF8A51 (5% toward black) |
| light LIBRARY.count text | `#A0712F` on `#FFFFFF` | 4.5:1 | #9B6E2E (3% toward black) |
| dark LIBRARY.wellIcon | `#6A6258` on `#26221D` | 3:1 | #736B62 (6% toward white) |
| light inkMuted on accentSoft | `#6E6E6E` on `#FBEDD6` | 4.5:1 | #6C6C6C (2% toward black) |
| dark raisedEdge | `rgba(247,243,234,0.22)` on `#0A0A0A` | 3:1 | rgba(247,243,234,0.36) (or solid #5F5E5B) |
