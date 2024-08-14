/**@license
 * fu-parser
 *
 *   All rights reserved
 *
 * ------------------------------------------------------------------------
 * pdf.js
 * Copyright 2023 Mozilla Foundation
 *
 * Licensed under the Apache License, Version 2.0 (the "License");
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 * See the License for the specific language governing permissions and
 * limitations under the License.
 *
 * ------------------------------------------------------------------------
 * typia
 * MIT License
 *
 * Copyright (c) 2022 Jeongho Nam
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */

import { FultimatorImportApplication } from "./apps/import-fultimator";
import { ImportPDFApplication } from "./apps/import-pdf";

Hooks.on("renderSettings", async (_app, $html) => {
	if (game.user.isGM) {
		const html = $html[0];
		const header = document.createElement("h2");
		header.appendChild(new Text("FU Importer"));
		const importPDFButton = document.createElement("button");
		importPDFButton.type = "button";
		importPDFButton.append("Import PDF");
		importPDFButton.addEventListener("click", () => {
			const application = new ImportPDFApplication(
				{ pdfPath: "", imagePath: "", parseResults: [], inProgress: false },
				{
					width: 450,
					height: 600,
					submitOnChange: true,
					closeOnSubmit: false,
					title: "Fabula Ultima PDF importer",
					resizable: true,
				},
			);
			application.render(true);
		});

		const importFultimatorButton = document.createElement("button");
		importFultimatorButton.type = "button";
		importFultimatorButton.append("Import Fultimator");
		importFultimatorButton.addEventListener("click", () => {
			const application = new FultimatorImportApplication(
				{ text: "", dataType: undefined, inProgress: false },
				{
					width: 450,
					height: 600,
					submitOnChange: true,
					closeOnSubmit: false,
					title: "Fultimator import",
					resizable: true,
				},
			);
			application.render(true);
		});
		const div = document.createElement("div");
		div.appendChild(importPDFButton);
		div.appendChild(importFultimatorButton);
		html.querySelector("#settings-documentation")?.after(header, div);
	}
});
