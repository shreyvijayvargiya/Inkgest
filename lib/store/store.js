import { configureStore, combineReducers } from "@reduxjs/toolkit";
import { persistStore, persistReducer } from "redux-persist";
import storage from "redux-persist/lib/storage";
import subscriptionReducer from "./slices/subscriptionSlice";
import userReducer from "./slices/userSlice";

const persistConfig = {
	key: "root",
	storage,
	whitelist: ["subscription", "user"],
};

const rootReducer = combineReducers({
	subscription: subscriptionReducer,
	user: userReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
	reducer: persistedReducer,
	middleware: (getDefaultMiddleware) =>
		getDefaultMiddleware({
			serializableCheck: {
				ignoredActions: [
					"persist/PERSIST",
					"persist/REHYDRATE",
					"persist/PURGE",
					"subscription/setSubscription",
				],
				ignoredPaths: ["subscription.expiresAt"],
			},
		}),
});

export const persistor = persistStore(store);

