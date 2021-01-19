import { BrowserModule } from '@angular/platform-browser';
import { NgModule } from '@angular/core';
import { FormsModule } from '@angular/forms';

import { HomePage } from './home/home.page';
import { ComingSoonPage } from './coming-soon/coming-soon.page';
import { NotFoundPage } from './not-found/not-found.page';
import { AngularMaterialModule } from '../components/vapaee/angular.material.module';
import { VapaeeComponentsModule } from '../components/vapaee/vapaee-components.module';
import { ExamplePage } from './example/example.page';
import { AngularMaterialPage } from './angular-material/angular-material.page';
import { WalletPage } from './wallet/wallet.page';

import { MatInputModule } from '@angular/material/input';
import { MatFormFieldModule } from "@angular/material/form-field";

import { IonicModule } from '@ionic/angular';

@NgModule({
    declarations: [
        HomePage,
        ComingSoonPage,
        NotFoundPage,
        ExamplePage,
        AngularMaterialPage,
        WalletPage
    ],
    imports: [
        BrowserModule,
        FormsModule,
        AngularMaterialModule,
        VapaeeComponentsModule,
        IonicModule         
    ],
    providers: [
        
    ],
    exports: [
        HomePage,
        ComingSoonPage,
        NotFoundPage,
        ExamplePage,
        AngularMaterialPage,
        WalletPage
    ]
})
export class PagesModule { }
