import { GoogleGenAI, GenerateContentResponse, Type } from "@google/genai";
import { Model, Api, ApiCollection, Controller, Route, Middleware } from '../types';

const getAiClient = () => {
    const apiKey = localStorage.getItem('geminiApiKey');
    if (!apiKey) {
        throw new Error("Gemini API key not found in local storage. Please set it up.");
    }
    // Re-initialize on each call to ensure the latest API key from storage is used.
    return new GoogleGenAI({ apiKey });
};


const parseJsonResponse = <T,>(text: string): T | null => {
    let jsonStr = text.trim();
    const fenceRegex = /^```(\w*)?\s*\n?(.*?)\n?\s*```$/s;
    const match = jsonStr.match(fenceRegex);
    if (match && match[2]) {
        jsonStr = match[2].trim();
    }
    try {
        return JSON.parse(jsonStr) as T;
    } catch (e) {
        console.error("Failed to parse JSON response:", e, "Raw text:", text);
        return null;
    }
};

export const generateModels = async (prompt: string): Promise<Model[] | null> => {
    const ai = getAiClient();
    const fullPrompt = `
You are an expert backend development assistant specializing in Node.js and Mongoose.
Based on the user's request, generate one or more database model definitions.
The user wants: "${prompt}".

For each model, you must provide:
1. A 'name' in PascalCase (e.g., "User", "ProductOrder").
2. A list of 'fields', each with a 'name' (camelCase) and a 'type' (Mongoose data type like 'String', 'Number', 'Date', 'Boolean', 'ObjectId').
3. The complete Mongoose schema 'code' as a string, including require statements and module.exports.

Respond ONLY with a valid JSON array of objects in the following format. Do not include any other text or explanations.
[
  {
    "name": "ModelName",
    "fields": [
      {"name": "fieldName1", "type": "String"},
      {"name": "fieldName2", "type": "Number"}
    ],
    "code": "const mongoose = require('mongoose');\\n\\nconst modelNameSchema = new mongoose.Schema({\\n  fieldName1: { type: String, required: true },\\n  fieldName2: { type: Number, required: true }\\n});\\n\\nmodule.exports = mongoose.model('ModelName', modelNameSchema);"
  }
]`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            // FIX: Using gemini-2.5-pro for code generation as it's a complex task.
            model: "gemini-2.5-pro",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                // FIX: Added responseSchema for more reliable JSON output.
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            fields: {
                                type: Type.ARRAY,
                                items: {
                                    type: Type.OBJECT,
                                    properties: {
                                        name: { type: Type.STRING },
                                        type: { type: Type.STRING },
                                    },
                                    required: ['name', 'type'],
                                },
                            },
                            code: { type: Type.STRING },
                        },
                        required: ['name', 'fields', 'code'],
                    }
                }
            },
        });
        const modelsData = parseJsonResponse<Omit<Model, 'id' | 'history'>[]>(response.text);
        return modelsData ? modelsData.map(m => ({ ...m, id: `model-${Date.now()}-${Math.random()}`, history: [] })) : null;
    } catch (error) {
        console.error("Error generating models:", error);
        // The UI should catch this and potentially re-prompt for API key if it's an auth error.
        throw error;
    }
};


export const generateApis = async (prompt: string, existingModels: Model[]): Promise<ApiCollection[] | null> => {
    const ai = getAiClient();
    const modelContext = existingModels.map(m => ({ name: m.name, fields: m.fields }));
    const fullPrompt = `
You are an expert backend development assistant for Node.js/Express.
The user has the following Mongoose models defined:
${JSON.stringify(modelContext, null, 2)}

Based on this context, the user wants to create REST APIs for: "${prompt}".

Generate one or more API endpoint definitions. Group related APIs together by giving them a logical 'collectionName'.

For each API, you must provide:
1. A 'collectionName' (string, e.g., "User Management", "Product APIs").
2. A short 'name' for the API operation (e.g., "CreateUser", "GetAllProducts").
3. The 'endpoint' path (e.g., "/api/users").
4. The HTTP 'method' (e.g., "POST", "GET").
5. A brief 'description' of what the API does.
6. The complete Express route handler 'code' as a string. This code should be a self-contained async function. Assume models can be imported like \`const ModelName = require('../models/ModelName');\`.
7. An optional 'requestBodyExample' as a JSON string. This is required for methods like POST, PUT, PATCH. For GET or DELETE, this should be null.
8. A 'responseBodyExample' as a JSON string showing a typical successful response body.

Respond ONLY with a valid JSON array of objects in the following format.
[
  {
    "collectionName": "User APIs",
    "name": "CreateUser",
    "endpoint": "/api/users",
    "method": "POST",
    "description": "Creates a new user.",
    "requestBodyExample": "{\\\"name\\\": \\\"Jane Doe\\\", \\\"email\\\": \\\"jane.doe@example.com\\\"}",
    "responseBodyExample": "{\\\"_id\\\": \\\"60d...\\\", \\\"name\\\": \\\"Jane Doe\\\", \\\"email\\\": \\\"jane.doe@example.com\\\"}",
    "code": "async (req, res) => { try { const User = require('../models/User'); const newUser = new User(req.body); await newUser.save(); res.status(201).json(newUser); } catch (error) { res.status(400).json({ message: error.message }); } }"
  }
]`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            // FIX: Using gemini-2.5-pro for code generation as it's a complex task.
            model: "gemini-2.5-pro",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                // FIX: Added responseSchema for more reliable JSON output.
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            collectionName: { type: Type.STRING },
                            name: { type: Type.STRING },
                            endpoint: { type: Type.STRING },
                            method: { type: Type.STRING },
                            description: { type: Type.STRING },
                            requestBodyExample: { type: Type.STRING },
                            responseBodyExample: { type: Type.STRING },
                            code: { type: Type.STRING },
                        },
                        required: ['collectionName', 'name', 'endpoint', 'method', 'description', 'responseBodyExample', 'code'],
                    }
                }
            },
        });

        const rawApiData = parseJsonResponse<({ collectionName: string } & Omit<Api, 'id' | 'history'>)[]>(response.text);

        if (!rawApiData) return null;

        const collectionsMap = new Map<string, ApiCollection>();
        rawApiData.forEach(item => {
            const { collectionName, ...apiData } = item;
            if (!collectionsMap.has(collectionName)) {
                collectionsMap.set(collectionName, {
                    id: `coll-${Date.now()}-${Math.random()}`,
                    name: collectionName,
                    apis: []
                });
            }
            const collection = collectionsMap.get(collectionName)!;
            collection.apis.push({
                ...apiData,
                id: `api-${Date.now()}-${Math.random()}`,
                history: []
            });
        });

        return Array.from(collectionsMap.values());
    } catch (error) {
        console.error("Error generating APIs:", error);
        throw error;
    }
};

export const generateControllers = async (models: Model[], apis: Api[]): Promise<Controller[] | null> => {
    if (apis.length === 0) {
        return [];
    }

    // A map to hold data for each controller file.
    // Key: 'userController.js', Value: { modelNames: Set<'User'>, functions: [{ name: 'createUser', code: '...' }] }
    const controllersMap = new Map<string, { modelNames: Set<string>, functions: {name: string, code: string}[] }>();

    // Heuristic to find the base name from API endpoint (e.g., /api/users -> user)
    const getBaseNameFromEndpoint = (endpoint: string): string | null => {
        const parts = endpoint.split('/').filter(p => p && p !== 'api' && !p.startsWith(':'));
        if (parts.length > 0) {
            let name = parts[0];
            // De-pluralize (simple version)
            if (name.endsWith('ies')) {
                name = name.slice(0, -3) + 'y';
            } else if (name.endsWith('s')) {
                name = name.slice(0, -1);
            }
            return name;
        }
        return null;
    };
    
    // Group APIs into controllers
    for (const api of apis) {
        let controllerFileBaseName: string | null = null;
        
        // Strategy 1: Find model name from endpoint
        const baseName = getBaseNameFromEndpoint(api.endpoint);
        if (baseName) {
            const modelMatch = models.find(m => m.name.toLowerCase() === baseName);
            if (modelMatch) {
                controllerFileBaseName = `${modelMatch.name.charAt(0).toLowerCase() + modelMatch.name.slice(1)}`;
            }
        }
        
        // Strategy 2 (Fallback): Find model name from API name (e.g., createUser -> user)
        if (!controllerFileBaseName) {
            for (const model of models) {
                if (api.name.toLowerCase().includes(model.name.toLowerCase())) {
                    controllerFileBaseName = `${model.name.charAt(0).toLowerCase() + model.name.slice(1)}`;
                    break;
                }
            }
        }

        // Default to a general controller if no association found
        if (!controllerFileBaseName) {
            controllerFileBaseName = 'general';
        }
        
        const controllerName = `${controllerFileBaseName}Controller.js`;

        if (!controllersMap.has(controllerName)) {
            controllersMap.set(controllerName, { modelNames: new Set(), functions: [] });
        }
        
        const controllerData = controllersMap.get(controllerName)!;
        
        // Scan the code for any model dependencies
        const codeModelMatches = api.code.matchAll(/require\(['"]\.\.\/models\/(\w+)['"]\)/g);
        for (const match of codeModelMatches) {
            controllerData.modelNames.add(match[1]);
        }
        
        const handlerName = api.name.charAt(0).toLowerCase() + api.name.slice(1);
        controllerData.functions.push({name: handlerName, code: api.code});
    }

    // Build the final controller objects
    const result: Controller[] = [];
    for (const [name, data] of controllersMap.entries()) {
        const requireStatements = Array.from(data.modelNames)
            .map(modelName => `const ${modelName} = require('../models/${modelName}');`)
            .join('\n');
        
        const functionsCode = data.functions.map(f => `exports.${f.name} = ${f.code};`).join('\n\n');
        
        const fullCode = [requireStatements, functionsCode].filter(Boolean).join('\n\n');
        
        result.push({
            id: `ctrl-${Date.now()}-${Math.random()}`,
            name,
            code: fullCode,
            history: []
        });
    }
    
    return Promise.resolve(result.length > 0 ? result : []);
};


export const generateRoutes = async (controllers: Controller[], apis: Api[]): Promise<Route[] | null> => {
    if (controllers.length === 0 || apis.length === 0) {
        return Promise.resolve([]);
    }

    const routesDataByController = new Map<string, {
        routeFileName: string;
        controllerVarName: string;
        controllerImportPath: string;
        routes: { method: string; endpoint: string; handler: string }[];
    }>();

    for (const controller of controllers) {
        const baseName = controller.name.replace('Controller.js', '');
        routesDataByController.set(controller.name, {
            routeFileName: `${baseName}Routes.js`,
            controllerVarName: `${baseName}Controller`,
            controllerImportPath: `../controllers/${controller.name}`,
            routes: [],
        });
    }

    for (const api of apis) {
        const handlerName = api.name.charAt(0).toLowerCase() + api.name.slice(1);
        for (const controller of controllers) {
            const exportRegex = new RegExp(`exports\\.${handlerName}\\s*=`);
            if (exportRegex.test(controller.code)) {
                const routeData = routesDataByController.get(controller.name);
                if (routeData) {
                    routeData.routes.push({
                        method: api.method.toLowerCase(),
                        endpoint: api.endpoint,
                        handler: handlerName,
                    });
                }
                break; 
            }
        }
    }

    const result: Route[] = [];
    for (const data of routesDataByController.values()) {
        if (data.routes.length === 0) continue;

        const routeDefinitions = data.routes
            .map(r => `router.${r.method}('${r.endpoint}', ${data.controllerVarName}.${r.handler});`)
            .join('\n');

        const fullCode = `const express = require('express');
const router = express.Router();
const ${data.controllerVarName} = require('${data.controllerImportPath}');

${routeDefinitions}

module.exports = router;`;

        result.push({
            id: `route-${Date.now()}-${Math.random()}`,
            name: data.routeFileName,
            code: fullCode,
            history: [],
        });
    }

    return Promise.resolve(result);
};


export const generateMiddlewares = async (models: Model[], apis: Api[]): Promise<Middleware[] | null> => {
    const ai = getAiClient();
    const fullPrompt = `
You are a Node.js/Express expert. Your task is to generate common middleware files.
The application context includes these Models:
${JSON.stringify(models.map(m => m.name), null, 2)}

And these API endpoints:
${JSON.stringify(apis.map(a => ({ endpoint: a.endpoint, method: a.method })), null, 2)}

Based on this, generate a JSON array of useful middleware files. Specifically, include:
1.  **Authentication ('auth.js')**: A template for checking a JWT token from the Authorization header.
2.  **Request Logger ('logger.js')**: A simple middleware to log the method and path of incoming requests.
3.  **File Upload ('upload.js')**: A middleware using 'multer' to handle 'multipart/form-data'. Configure it for single file uploads to an 'uploads/' directory. Include comments explaining how to install multer and use the middleware in a route.

Respond ONLY with a valid JSON array of objects in the following format. Do not include any other text or explanations.
[
  {
    "name": "auth.js",
    "code": "const jwt = require('jsonwebtoken');\\n\\nconst authenticateToken = (req, res, next) => {\\n  const authHeader = req.headers['authorization'];\\n  const token = authHeader && authHeader.split(' ')[1];\\n  if (token == null) return res.sendStatus(401); // Unauthorized\\n\\n  jwt.verify(token, process.env.TOKEN_SECRET, (err, user) => {\\n    if (err) return res.sendStatus(403); // Forbidden\\n    req.user = user;\\n    next();\\n  });\\n};\\n\\nmodule.exports = authenticateToken;"
  },
  {
    "name": "logger.js",
    "code": "const logger = (req, res, next) => {\\n  console.log(\`\${new Date().toISOString()} - \${req.method} \${req.originalUrl}\`);\\n  next();\\n};\\n\\nmodule.exports = logger;"
  },
  {
    "name": "upload.js",
    "code": "// 1. Install multer: npm install multer\\n// 2. Create an 'uploads' directory in your project root.\\nconst multer = require('multer');\\n\\nconst storage = multer.diskStorage({\\n  destination: function (req, file, cb) {\\n    cb(null, 'uploads/');\\n  },\\n  filename: function (req, file, cb) {\\n    cb(null, Date.now() + '-' + file.originalname);\\n  }\\n});\\n\\nconst upload = multer({ storage: storage });\\n\\n// 3. Usage in your route file:\\n// const upload = require('../middleware/upload');\\n// router.post('/your-route', upload.single('myFile'), (req, res) => {\\n//   // req.file is the 'myFile' file\\n//   // req.body will hold the text fields, if there were any\\n//   res.send({ message: 'File uploaded successfully', file: req.file });\\n// });\\n\\nmodule.exports = upload;"
  }
]`;

    try {
        const response: GenerateContentResponse = await ai.models.generateContent({
            // FIX: Using gemini-2.5-pro for code generation as it's a complex task.
            model: "gemini-2.5-pro",
            contents: fullPrompt,
            config: {
                responseMimeType: "application/json",
                // FIX: Added responseSchema for more reliable JSON output.
                responseSchema: {
                    type: Type.ARRAY,
                    items: {
                        type: Type.OBJECT,
                        properties: {
                            name: { type: Type.STRING },
                            code: { type: Type.STRING },
                        },
                        required: ['name', 'code'],
                    }
                }
            },
        });
        const middlewareData = parseJsonResponse<Omit<Middleware, 'id' | 'history'>[]>(response.text);
        return middlewareData ? middlewareData.map(m => ({ ...m, id: `mid-${Date.now()}-${Math.random()}`, history: [] })) : null;
    } catch (error) {
        console.error("Error generating middlewares:", error);
        throw error;
    }
};