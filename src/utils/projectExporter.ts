import JSZip from 'jszip';
import { AndroidProject } from '../types';
import {
  generateScreenKotlin,
  generateStateManagerKotlin,
  generateMainActivityKotlin,
  generateThemeKotlin,
  generateRoomEntity,
  generateRoomDao,
  generateRoomDatabaseKotlin
} from './kotlinGen';

/**
 * Builds a ZIP archive of a standard Android Studio project conforming to Jetpack Compose structure.
 */
export async function exportProjectZip(project: AndroidProject): Promise<Blob> {
  const zip = new JSZip();

  const pkgPath = project.packageName.replace(/\./g, '/');

  // Root level configurations
  zip.file('settings.gradle.kts', `
pluginManagement {
    repositories {
        google()
        mavenCentral()
        gradlePluginPortal()
    }
}
dependencyResolutionManagement {
    repositoriesMode.set(RepositoriesMode.FAIL_ON_PROJECT_REPOS)
    repositories {
        google()
        mavenCentral()
    }
}
rootProject.name = "${project.appName.replace(/\s+/g, '')}"
include(":app")
`);

  zip.file('build.gradle.kts', `
plugins {
    alias(libs.plugins.android.application) apply false
    alias(libs.plugins.kotlin.android) apply false
}
`);

  zip.file('gradle.properties', `
org.gradle.jvmargs=-Xmx2048m -Dfile.encoding=UTF-8
android.useAndroidX=true
android.nonTransitiveRClass=true
`);

  // App Level Module structure
  const appFolder = zip.folder('app')!;
  
  appFolder.file('build.gradle.kts', `
plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.android)
}

android {
    namespace = "${project.packageName}"
    compileSdk = 34

    defaultConfig {
        applicationId = "${project.packageName}"
        minSdk = 26
        targetSdk = 34
        versionCode = 1
        versionName = "1.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"
        vectorDrawables {
            useSupportLibrary = true
        }
    }

    buildTypes {
        release {
            isMinifyEnabled = false
            proguardFiles(
                getDefaultProguardFile("proguard-android-optimize.txt"),
                "proguard-rules.pro"
            )
        }
    }
    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }
    kotlinOptions {
        jvmTarget = "17"
    }
    buildFeatures {
        compose = true
    }
    composeOptions {
        kotlinCompilerExtensionVersion = "1.5.1"
    }
    packaging {
        resources {
            excludes += "/META-INF/{AL2.0,LGPL2.1}"
        }
    }
}

dependencies {
    implementation(libs.androidx.core.ktx)
    implementation(libs.androidx.lifecycle.runtime.ktx)
    implementation(libs.androidx.activity.compose)
    implementation(platform(libs.androidx.compose.bom))
    implementation(libs.androidx.compose.ui)
    implementation(libs.androidx.compose.ui.graphics)
    implementation(libs.androidx.compose.ui.tooling.preview)
    implementation(libs.androidx.compose.material3)
    implementation(libs.androidx.navigation.compose)

    testImplementation(libs.junit)
    androidTestImplementation(libs.androidx.junit)
    androidTestImplementation(libs.androidx.espresso.core)
    androidTestImplementation(platform(libs.androidx.compose.bom))
    androidTestImplementation(libs.androidx.compose.ui.test.junit4)
    debugImplementation(libs.androidx.compose.ui.tooling)
    debugImplementation(libs.androidx.compose.ui.test.manifest)
}
`);

  // Android Manifest
  const srcMain = appFolder.folder('src/main')!;
  srcMain.file('AndroidManifest.xml', `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">

    <uses-permission android:name="android.permission.INTERNET" />

    <application
        android:allowBackup="true"
        android:icon="@mipmap/ic_launcher"
        android:label="${project.appName}"
        android:roundIcon="@mipmap/ic_launcher_round"
        android:supportsRtl="true"
        android:theme="@android:style/Theme.Material.NoActionBar">
        <activity
            android:name=".MainActivity"
            android:exported="true"
            android:label="${project.appName}"
            android:theme="@android:style/Theme.Material.NoActionBar">
            <intent-filter>
                <action android:name="android.intent.action.MAIN" />
                <category android:name="android.intent.category.LAUNCHER" />
            </intent-filter>
        </activity>
    </application>

</manifest>
`);

  // Version catalogs (libs.versions.toml) for clean dependency definitions
  const gradleFolder = zip.folder('gradle')!;
  gradleFolder.file('libs.versions.toml', `
[versions]
agp = "8.2.0"
kotlin = "1.9.0"
coreKtx = "1.12.0"
junit = "4.13.2"
junitVersion = "1.1.5"
espressoCore = "3.5.1"
lifecycleRuntimeKtx = "2.7.0"
activityCompose = "1.8.2"
composeBom = "2023.08.00"
navigationCompose = "2.7.7"

[libraries]
androidx-core-ktx = { group = "androidx.core", name = "core-ktx", version.ref = "coreKtx" }
junit = { group = "junit", name = "junit", version.ref = "junit" }
androidx-junit = { group = "androidx.test.ext", name = "junit", version.ref = "junitVersion" }
androidx-espresso-core = { group = "androidx.test.espresso", name = "espresso-core", version.ref = "espressoCore" }
androidx-lifecycle-runtime-ktx = { group = "androidx.lifecycle", name = "lifecycle-runtime-ktx", version.ref = "lifecycleRuntimeKtx" }
androidx-activity-compose = { group = "androidx.activity", name = "activity-compose", version.ref = "activityCompose" }
androidx-compose-bom = { group = "androidx.compose", name = "compose-bom", version.ref = "composeBom" }
androidx-compose-ui = { group = "androidx.compose.ui", name = "ui" }
androidx-compose-ui-graphics = { group = "androidx.compose.ui", name = "ui-graphics" }
androidx-compose-ui-tooling = { group = "androidx.compose.ui", name = "ui-tooling" }
androidx-compose-ui-tooling-preview = { group = "androidx.compose.ui", name = "ui-tooling-preview" }
androidx-compose-ui-test-manifest = { group = "androidx.compose.ui", name = "ui-test-manifest" }
androidx-compose-ui-test-junit4 = { group = "androidx.compose.ui", name = "ui-test-junit4" }
androidx-compose-material3 = { group = "androidx.compose.material3", name = "material3" }
androidx-navigation-compose = { group = "androidx.navigation", name = "navigation-compose", version.ref = "navigationCompose" }

[plugins]
android-application = { id = "com.android.application", version.ref = "agp" }
kotlin-android = { id = "org.jetbrains.kotlin.android", version.ref = "kotlin" }
`);

  // Java/Kotlin code files
  const javaFolder = srcMain.folder(`java/${pkgPath}`)!;
  
  // MainActivity.kt
  javaFolder.file('MainActivity.kt', generateMainActivityKotlin(project));

  // Theme configuration
  const themeFolder = javaFolder.folder('ui/theme')!;
  themeFolder.file(`${project.appName.replace(/\s+/g, '')}Theme.kt`, generateThemeKotlin(project));

  // Screens configurations
  const screensFolder = javaFolder.folder('ui/screens')!;
  
  // StateManager.kt
  screensFolder.file('GlobalStateManager.kt', generateStateManagerKotlin(project));

  // Database folder write operations if DB is defined
  if (project.databaseTables && project.databaseTables.length > 0) {
    const dataFolder = javaFolder.folder('data')!;
    project.databaseTables.forEach(table => {
      const entityName = table.name.charAt(0).toUpperCase() + table.name.slice(1).replace(/\s+/g, '') + "Entity";
      const daoName = table.name.charAt(0).toUpperCase() + table.name.slice(1).replace(/\s+/g, '') + "Dao";
      
      dataFolder.file(`${entityName}.kt`, generateRoomEntity(table, project.packageName));
      dataFolder.file(`${daoName}.kt`, generateRoomDao(table, project.packageName));
    });
    
    dataFolder.file('AppDatabase.kt', generateRoomDatabaseKotlin(project.databaseTables, project.packageName));
  }

  // Individual screens files
  project.screens.forEach(screen => {
    const screenNameNoSpace = screen.name.replace(/\s+/g, '');
    screensFolder.file(`${screenNameNoSpace}Screen.kt`, generateScreenKotlin(screen, project));
  });

  // README with visual loading and installation guidelines
  zip.file('README.md', `
# ${project.appName}

This Android Studio workspace was generated automatically using the **Android App Maker** from Google AI Studio. It contains a fully realized, clean, typed Jetpack Compose architecture implementing multi-screen navigation and proactive Material 3 components in Kotlin.

## 🚀 How to Import and run on Android Studio

1. **Prerequisites**: Confirm you have the latest stable [Android Studio (Hedgehog or newer)](https://developer.android.com/studio) and JDK 17 installed.
2. **Decompress**: Extract the downloaded \`.zip\` file into a clean local project directory.
3. **Import**:
   - Launch Android Studio.
   - Click **File > Open** (or click **Open** from the welcome screen).
   - Navigate to the extracted folder, select the root folder, and click **OK**.
4. **Gradle Sync**: Android Studio will automatically identify standard build configuration scripts and trigger a Gradle sync. Wait 1-2 minutes for completion.
5. **Run**:
   - Plug in your Android physical phone device with *USB Debugging* enabled, or launch an Emulator from target device dropdown menus.
   - Press the green **Run (Play)** button in the toolbar to compile, sign, and deploy your native \`.apk\`!

## 📦 Jetpack Compose App Structure

The code conforms to modern architecture patterns recommendation by Google:
- \`MainActivity.kt\`: Defines the navigation layout, loading views, and registers composables matching route graphs.
- \`ui/screens/GlobalStateManager.kt\`: A custom lightweight Viewmodel tracking state transitions that components reactive-bind to.
- \`ui/screens/*Screen.kt\`: Native compose visual views containing Material 3 panels.
- \`ui/theme/*Theme.kt\`: Implements colors matching the designer panels.
`);

  // Generate and return Blob
  return await zip.generateAsync({ type: 'blob' });
}
