import { Component, OnInit, OnDestroy, ViewChild, ElementRef, ViewChildren, QueryList, Renderer2 } from '@angular/core';
import { NgForm } from '@angular/forms';
import { ActivatedRoute } from "@angular/router";
import { environment } from 'environments/environment';
import { Subscription } from 'rxjs/Subscription';
import { EventsService } from 'app/shared/services/events.service';
import swal from 'sweetalert2';
import { TranslateService } from '@ngx-translate/core';
import { ToastsManager } from 'ng2-toastr/ng2-toastr';
import { NgbModal, NgbModalRef, NgbModalOptions } from '@ng-bootstrap/ng-bootstrap';
import { HttpClient } from "@angular/common/http";
import { ApiDx29ServerService } from 'app/shared/services/api-dx29-server.service';
import { SearchService } from 'app/shared/services/search.service';
import { v4 as uuidv4 } from 'uuid';
import { jsPDFService } from 'app/shared/services/jsPDF.service'
import { InsightsService } from 'app/shared/services/azureInsights.service';
import { Observable} from 'rxjs';
import 'rxjs/add/observable/of';
import 'rxjs/add/operator/toPromise';

declare let gtag: any;

@Component({
    selector: 'app-undiagnosed-page',
    templateUrl: './undiagnosed-page.component.html',
    styleUrls: ['./undiagnosed-page.component.scss'],
    providers: [ApiDx29ServerService, jsPDFService, InsightsService],
})

export class UndiagnosedPageComponent implements OnInit, OnDestroy {

    private subscription: Subscription = new Subscription();
    medicalText: string = '';
    premedicalText: string = '';
    temppremedicalText: string = '';
    medicalText2: string = '';
    medicalText2Copy: string = '';
    copyMedicalText: string = '';
    modalReference: NgbModalRef;
    topRelatedConditions: any = [];
    diseaseListEn: any = [];
    lang: string = 'en';
    originalLang: string = 'en';
    detectedLang: string = 'en';
    selectedInfoDiseaseIndex: number = -1;
    minSymptoms: number = 2;
    _startTime: any;

    myuuid: string = uuidv4();
    eventList: any = [];
    steps = [];
    currentStep: any = {};
    questions: any = [];
    answerOpenai: string = '';
    showErrorCall1: boolean = false;
    showErrorCall2: boolean = false;
    callingOpenai: boolean = false;
    loadingAnswerOpenai: boolean = false;
    selectedDisease: string = '';
    showInputRecalculate: boolean = false;
    options: any = [];
    optionSelected: any = {};
    sendingVote: boolean = false;
    sendingFeedbackQuestions: boolean = false;
    selectorRare: boolean = true;
    prevSelectorRare: boolean = true;
    selectorOption: string = '';
    optionRare: string = '';
    optionCommon: string = '';
    symtpmsLabel: string = '';
    feedBack1input: string = '';
    feedBack2input: string = '';
    sending: boolean = false;
    symptomsDifferencial: any = [];
    langToExtract: string = '';
    parserObject: any = { parserStrategy: 'Auto', callingParser: false, file: undefined };
    langDetected: string = '';
    selectedQuestion: string = '';
    closed = false;
    email: string = '';
    checkSubscribe: boolean = false;
    loadMoreDiseases: boolean = false;
    @ViewChild('f') feedbackDownForm: NgForm;
    showErrorForm: boolean = false;
    sponsors = [];
    stepDisclaimer: number = 1;
    hasAnonymize: boolean = false;
    callingAnonymize: boolean = false;
    tienePrisa: boolean = false;
    resultAnonymized: string = '';
    copyResultAnonymized: string = '';
    voteId: string = '';
    lastVote: string = '';

    @ViewChildren('autoajustable') textAreas: QueryList<ElementRef>;
    @ViewChildren('autoajustable2') textAreas2: QueryList<ElementRef>;
    @ViewChild("autoajustable") inputTextAreaElement: ElementRef;
    constructor(private route: ActivatedRoute, private http: HttpClient, public translate: TranslateService, private searchService: SearchService, public toastr: ToastsManager, private modalService: NgbModal, private apiDx29ServerService: ApiDx29ServerService, private eventsService: EventsService, public jsPDFService: jsPDFService, public insightsService: InsightsService, private renderer: Renderer2) {

        this.lang = sessionStorage.getItem('lang');
        this.originalLang = sessionStorage.getItem('lang');
        this._startTime = Date.now();

        if (sessionStorage.getItem('uuid') != null) {
            this.myuuid = sessionStorage.getItem('uuid');
        } else {
            this.myuuid = uuidv4();
            sessionStorage.setItem('uuid', this.myuuid);
        }

        this.steps = [
            { stepIndex: 1, isComplete: false, title: this.translate.instant("land.step1") },
            { stepIndex: 2, isComplete: false, title: this.translate.instant("land.step3") }
        ];
        this.currentStep = this.steps[0];

        this.loadSponsors();
    }

    loadSponsors(){
        this.subscription.add(this.http.get('assets/jsons/sponsors.json')
            .subscribe((res: any) => {
                this.sponsors = res;
            }, (err) => {
                this.insightsService.trackException(err);
                console.log(err);
            }));
    }

    initQuestions() {
        this.questions = [
            { id: 1, question: this.translate.instant("land.q1") },
            { id: 2, question: this.translate.instant("land.q2") },
            { id: 3, question: this.translate.instant("land.q3") },
            { id: 4, question: this.translate.instant("land.q4") },
            { id: 5, question: this.translate.instant("land.q5") },
        ];
    }

    initOptions() {
        this.options = [
            { id: 1, value: this.translate.instant("land.option1"), label: this.translate.instant("land.labelopt1"), description: this.translate.instant("land.descriptionopt1") },
            { id: 2, value: this.translate.instant("land.option3"), label: this.translate.instant("land.labelopt3"), description: this.translate.instant("land.descriptionopt3") },
        ];

        window.scrollTo(0, 0);

    }

    async goPrevious() {
        this.selectorRare = true;
        this.prevSelectorRare = true;
        this.topRelatedConditions = [];
        this.showInputRecalculate = false;
        this.currentStep = this.steps[0];
        //document.getElementById('initsteps').scrollIntoView({ behavior: "smooth" });
        await this.delay(200);
        document.getElementById('optioninput1').scrollIntoView({ behavior: "smooth" });
        this.clearText();
    }

    async newPatient() {
        this.medicalText = '';
        this.goPrevious();
    }

    canDeactivate(): Observable<boolean> | Promise<boolean> | boolean {
        if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
            return false;
        } else {
            return true;
        }
        //return true;
    }

    getElapsedSeconds() {
        var endDate = Date.now();
        var seconds = (endDate - this._startTime) / 1000;
        return seconds;
    };

    lauchEvent(category) {
        //traquear
        var secs = this.getElapsedSeconds();
        var savedEvent = this.searchService.search(this.eventList, 'name', category);
        if (category == "Info Disease") {
            var subcate = 'Info Disease - ' + this.selectedDisease;
            this.eventList.push({ name: subcate });
            gtag('event', subcate, { 'myuuid': this.myuuid, 'event_label': secs });
            subcate = 'Info Disease - ' + this.selectedDisease+ ' - '+this.selectedQuestion
            gtag('event', subcate, { 'myuuid': this.myuuid, 'event_label': secs });
            
        }
        if (!savedEvent) {
            this.eventList.push({ name: category });
            gtag('event', category, { 'myuuid': this.myuuid, 'event_label': secs });
        }
    }

    ngOnInit() {

        this.showwelcome();

        this.loadTranslations();

        this.eventsService.on('backEvent', function (event) {
            if (this.currentStep.stepIndex == 2) {
                this.goPrevious();
            }
        }.bind(this));
          
    }

    loadTranslations() {
        this.translate.get('land.step1').subscribe((res: string) => {
            this.steps[0].title = res;
        });
        this.translate.get('land.step3').subscribe(async (res: string) => {
            this.steps[1].title = res;
            //await this.delay(500);
            this.initQuestions();
            this.initOptions()
        });

        this.translate.get('land.rare').subscribe((res: string) => {
            this.optionRare = res;
        });
        this.translate.get('land.common').subscribe((res: string) => {
            this.optionCommon = res;
        });
        this.translate.get('land.Symptoms').subscribe((res: string) => {
            this.symtpmsLabel = res;
        });
    }

    showwelcome() {
        console.log(sessionStorage.getItem('hideModalwelcome') )
        if (sessionStorage.getItem('hideModalwelcome') == 'false' || !sessionStorage.getItem('hideModalwelcome')) {
            document.getElementById("openModalwelcome").click();
            sessionStorage.setItem('hideModalwelcome', 'true')
        }else{
            this.showDisclaimer();
        }
        
    }

    closewelcome() {
        if (this.modalReference != undefined) {
            this.modalReference.close();
        }
        this.showDisclaimer();
    }

    showDisclaimer() {
        console.log(localStorage.getItem('hideDisclaimer'))
        if (localStorage.getItem('hideDisclaimer') == null || !localStorage.getItem('hideDisclaimer')) {
            this.stepDisclaimer = 1;
            document.getElementById("openModalIntro").click();
        }
    }

    prevDisclaimer() {
        this.stepDisclaimer--;
    }

    nextDisclaimer() {
        this.stepDisclaimer++;
        if (this.stepDisclaimer > 6) {
            this.finishDisclaimer();
        }
    }

    finishDisclaimer() {
        if (this.modalReference != undefined) {
            this.modalReference.close();
        }
        localStorage.setItem('hideDisclaimer', 'true')
    }

    showPanelIntro(content) {
        if (this.modalReference != undefined) {
            this.modalReference.close();
        }
        let ngbModalOptions: NgbModalOptions = {
            backdrop: 'static',
            keyboard: false,
            windowClass: 'ModalClass-sm'
        };
        this.modalReference = this.modalService.open(content, ngbModalOptions);
    }

    delay(ms: number) {
        return new Promise(resolve => setTimeout(resolve, ms));
    }

    ngOnDestroy() {
        this.subscription.unsubscribe();
    }

    copyText(par) {
        if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
        }
        if (par == 'opt1') {
            this.medicalText = this.translate.instant("land.p1.1")
        } else {
            this.medicalText = this.translate.instant("land.p1.2")
        }
        document.getElementById('optioninput1').scrollIntoView({ behavior: "smooth" });
        //this.focusTextArea();
        this.resizeTextArea();
    }

    clearText() {
        this.medicalText2 = '';
        this.medicalText2Copy = '';
        this.showInputRecalculate = false;
        //this.medicalText = '';
        this.copyMedicalText = '';
        this.showErrorCall1 = false;
        document.getElementById("textarea1").setAttribute("style", "height:50px;overflow-y:hidden; width: 100%;");
        this.resizeTextArea();
    }

    async checkBody(){
        this.showErrorCall1 = false;
        if (this.callingOpenai || this.medicalText.length < 5) {
            this.showErrorCall1 = true;
            let text = this.translate.instant("land.required");
            if(this.medicalText.length>0){
                text = this.translate.instant("land.requiredMIN5");
            }
            swal({
                type: 'error',
                text: text,
                showCancelButton: false,
                showConfirmButton: true,
                allowOutsideClick: false
            })
        }
        if (!this.showErrorCall1) {
            this.preparingCallOpenAi('step1');
        }
    }

    verifCallOpenAi(step) {
        this.showErrorCall1 = false;
        if (this.callingOpenai || this.medicalText.length < 5) {
            this.showErrorCall1 = true;
        }
        if (!this.showErrorCall1) {
            this.preparingCallOpenAi(step);
        }
    }


    preparingCallOpenAi(step) {
        this.callingOpenai = true;
        if(step=='step3'|| step=='step4'|| (step=='step2' && this.showInputRecalculate && this.medicalText2.length>0)){
            if(this.optionSelected.id==1){
                var labelMoreSymptoms = this.translate.instant("land.msgmoresymptoms")
                if(this.medicalText.indexOf(labelMoreSymptoms)==-1){
                    this.copyMedicalText = this.copyMedicalText + '. ' + this.optionSelected.value + ' ' + this.medicalText2Copy
                     this.premedicalText = this.copyMedicalText;
                     this.medicalText= this.medicalText+ '. ' + labelMoreSymptoms + ' ' + this.medicalText2;
                    
                }else{
                    this.copyMedicalText = this.copyMedicalText + ', ' + this.medicalText2Copy
                    this.premedicalText = this.copyMedicalText; 
                    this.medicalText= this.medicalText+ ', ' + this.medicalText2;
                }
            }else if(this.optionSelected.id==2){
                var labeltest = this.translate.instant("land.msgtest")
                if(this.medicalText.indexOf(labeltest)==-1){
                    this.copyMedicalText = this.copyMedicalText + '. ' + this.optionSelected.value + ' ' + this.medicalText2Copy
                    this.premedicalText = this.copyMedicalText;
                    this.medicalText= this.medicalText+ '. ' + labeltest + ' ' + this.medicalText2;
                }else{
                    this.copyMedicalText = this.copyMedicalText + ', ' + this.medicalText2Copy
                    this.premedicalText = this.copyMedicalText; 
                    this.medicalText= this.medicalText+ ', ' + this.medicalText2;
                }
            }else{
                this.premedicalText = this.copyMedicalText + '. ' + this.optionSelected.value + ' ' + this.medicalText2Copy;
            }
        }else{
            this.premedicalText = this.medicalText;
        }
        this.medicalText2 = '';
        this.continuePreparingCallOpenAi(step);

    }

    continuePreparingCallOpenAi(step) {
        if(step=='step3'|| step=='step4'|| (step=='step2' && this.showInputRecalculate && this.medicalText2.length>0)){
            this.callOpenAi(step);
        }else{
            swal({
                title: this.translate.instant("generics.Please wait"),
                showCancelButton: false,
                showConfirmButton: false,
                allowOutsideClick: false
            }).then((result) => {
    
            });
            var testLangText = this.premedicalText.substr(0, 4000)
            if (testLangText.length > 0) {
                this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
                    .subscribe((res: any) => {
                        if (res[0].language != 'en') {
                            this.detectedLang = res[0].language;
                            var info = [{ "Text": this.premedicalText }]
                            this.subscription.add(this.apiDx29ServerService.getTranslationDictionary(res[0].language, info)
                                .subscribe((res2: any) => {
                                    var textToTA = this.premedicalText.replace(/\n/g, " ");
                                    if (res2[0] != undefined) {
                                        if (res2[0].translations[0] != undefined) {
                                            textToTA = res2[0].translations[0].text;
                                        }
                                    }
                                    this.premedicalText = textToTA;
                                    this.callOpenAi(step);
                                }, (err) => {
                                    this.insightsService.trackException(err);
                                    console.log(err);
                                    this.callOpenAi(step);
                                }));
                        } else {
                            this.detectedLang = 'en';
                            this.callOpenAi(step);
                        }
    
                    }, (err) => {
                        this.insightsService.trackException(err);
                        console.log(err);
                        this.toastr.error('', this.translate.instant("generics.error try again"));
                        this.callingOpenai = false;
                        swal.close();
                    }));
            } else {
                this.callOpenAi(step);
            }
        }
        
    }

    callOpenAi(step) {
        // call api POST openai
        swal.close();
        swal({
            html: '<p>' + this.translate.instant("land.swal") + '</p>'+ '<p>' + this.translate.instant("land.swal2") + '</p>' + '<p><em class="fa fa-spinner fa-2x fa-spin fa-fw"></em></p>',
            showCancelButton: true,
            showConfirmButton: false,
            cancelButtonText: this.translate.instant("generics.Cancel"),
            allowOutsideClick: false
        }).then(function (isConfirm) {
            if (!isConfirm) {
                // function when confirm button clicked
                this.callingOpenai = false;
                this.subscription.unsubscribe();
                this.subscription = new Subscription();
                if (step == 'step2') {
                    this.selectorRare = this.prevSelectorRare;
                    this.loadMoreDiseases = !this.loadMoreDiseases;
                }
            }

        }.bind(this));

        this.callingOpenai = true;
        let paramIntroText = this.optionRare;
        if (this.selectorRare) {
            paramIntroText = this.optionCommon;
        }
        let introText = this.translate.instant("land.prom1", {
            value: paramIntroText
        })
        
        var value = { value: introText + this.symtpmsLabel + " " + this.premedicalText, myuuid: this.myuuid, operation: 'find disease', lang: this.lang }
        if(this.loadMoreDiseases){
            value = { value: introText + this.symtpmsLabel + " " + this.temppremedicalText, myuuid: this.myuuid, operation: 'find disease', lang: this.lang }
        }
        if(step == 'step3'){
            let introText2 = this.translate.instant("land.prom2", {
                value: paramIntroText
            })
            value = { value: introText2 + this.symtpmsLabel + " " + this.temppremedicalText, myuuid: this.myuuid, operation: 'find disease', lang: this.lang }
        }
        this.subscription.add(this.apiDx29ServerService.postOpenAi(value)
            .subscribe((res: any) => {
                if(res.choices[0].message.content){
                    if (this.currentStep.stepIndex == 1 || step == 'step2') {
                        this.copyMedicalText = this.premedicalText;
                    }
                    this.callAnonymize(value, res.choices[0].message.content);//parseChoices0
                    let parseChoices0 = res.choices[0].message.content;
                    if(res.choices[0].message.content.indexOf("\n\n") > 0 && (res.choices[0].message.content.indexOf("+") > res.choices[0].message.content.indexOf("\n\n"))){
                        parseChoices0 = res.choices[0].message.content.split("\n\n");
                        parseChoices0.shift();
                        parseChoices0 = parseChoices0.toString();
                    }else if(res.choices[0].message.content.indexOf("\n") > 0 && (res.choices[0].message.content.indexOf("+") > res.choices[0].message.content.indexOf("\n"))){
                        parseChoices0 = res.choices[0].message.content.split("\n");
                        parseChoices0.shift();
                        parseChoices0 = parseChoices0.toString();
                    }else if(res.choices[0].message.content.indexOf("\n\n") == 0 && (res.choices[0].message.content.indexOf("+") > res.choices[0].message.content.indexOf("\n\n"))){
                        //delete up to index "+" 
                        parseChoices0 = res.choices[0].message.content.substring(res.choices[0].message.content.indexOf("+"));
                    }else if(res.choices[0].message.content.indexOf("\n") == 0 && (res.choices[0].message.content.indexOf("+") > res.choices[0].message.content.indexOf("\n"))){
                        //delete up to index "+" 
                        parseChoices0 = res.choices[0].message.content.substring(res.choices[0].message.content.indexOf("+"));
                    }
                    if(!this.loadMoreDiseases){
                        this.diseaseListEn = [];
                    }
                    if (step == 'step2') {
                        this.diseaseListEn = [];
                        this.topRelatedConditions = [];
                    }
                    this.setDiseaseListEn(parseChoices0);
                    if(this.detectedLang!='en'){
                        var jsontestLangText = [{ "Text": parseChoices0 }]
                        this.subscription.add(this.apiDx29ServerService.getSegmentation(this.detectedLang,jsontestLangText)
                        .subscribe( (res2 : any) => {
                            if (res2[0] != undefined) {
                                if (res2[0].translations[0] != undefined) {
                                    parseChoices0 = res2[0].translations[0].text;
                                }
                            }
                            this.continueCallOpenAi(parseChoices0);
                        }, (err) => {
                            this.insightsService.trackException(err);
                            console.log(err);
                            this.continueCallOpenAi(parseChoices0);
                        }));
                    }else{
                        this.continueCallOpenAi(parseChoices0);
                    }
                }else{
                    this.callingOpenai = false;
                    swal.close();
                    swal({
                        type: 'error',
                        text: "Vérifiez ou modifiez le texte que vous avez saisi, car notre IA n'a pas apprécié quelque chose. Si vous obtenez toujours ce message après avoir fait cela, essayez un autre jour pour nous donner le temps de corriger le problème. En attendant, vous pouvez rédiger une autre description du patient. Si vous avez besoin d'une aide immédiate, veuillez écrire à notre équipe d'assistance : support@foundation29.org Nous sommes désolés pour la gêne occasionnée.",
                        showCancelButton: false,
                        showConfirmButton: true,
                        allowOutsideClick: false
                    })
                }
                
                
            }, (err) => {
                this.insightsService.trackException(err);
                console.log(err);
                this.callingOpenai = false;
                swal.close();
                swal({
                    type: 'error',
                    text: this.translate.instant("generics.error try again"),
                    showCancelButton: false,
                    showConfirmButton: true,
                    allowOutsideClick: false
                })
            }));

    }

    includesElement(array, string){
        string = string.toLowerCase();
        for(let i = 0; i < array.length; i++) {            
            array[i] = array[i].toLowerCase();
            if(string.includes(array[i])){
                return true;
            }
        }
        return false;
    }

    async continueCallOpenAi(parseChoices0){
        let parseChoices = parseChoices0;
        
        //parseChoices = parseChoices0.split("+");
        parseChoices = parseChoices0.split(/\+(?=\d)/);
        if(!this.loadMoreDiseases){
            this.topRelatedConditions = [];
        }
        
        for (let i = 0; i < parseChoices.length; i++) {
            if (parseChoices[i] != '' && parseChoices[i] != "\n\n" && parseChoices[i] != "\n" && parseChoices[i].length>4) {
                this.topRelatedConditions.push({content:parseChoices[i], name: ''} )
            }
        }

        //for each top related condition Put in strong what goes before the first occurrence of :
        for (let i = 0; i < this.topRelatedConditions.length; i++) {
            let index = this.topRelatedConditions[i].content.indexOf(':');
            let index2 = this.topRelatedConditions[i].content.indexOf('<strong>');
            if (index != -1 && index2 == -1) {
                let firstPart = this.topRelatedConditions[i].content.substring(0, index + 1);
                let secondPart = this.topRelatedConditions[i].content.substring(index + 1, this.topRelatedConditions[i].content.length);
                //if secondPart is empty, delete this.topRelatedConditions[i] from array
                if(secondPart == ''){
                    this.topRelatedConditions.splice(i, 1);
                    this.diseaseListEn.splice(i, 1);
                    i--;
                    continue;
                }
                //this.topRelatedConditions[i] = '<strong>' + firstPart + '</strong>' + secondPart;
                let index3 = firstPart.indexOf('.');
                let namePart = firstPart.substring(index3+2, firstPart.length-1);
                let hasSponsor = false;
                let url = '';
                for (let j = 0; j < this.sponsors.length && !hasSponsor; j++) {
                    hasSponsor = this.includesElement(this.sponsors[j].synonyms, namePart)
                    if(hasSponsor){
                        url = this.sponsors[j].url;
                    }
                }
                
                
                this.topRelatedConditions[i] = {content: '<strong>' + firstPart + '</strong>' + secondPart, name: namePart, url: url};
            }
        }
        this.loadMoreDiseases = false;
        if (this.currentStep.stepIndex == 1) {
            this.currentStep = this.steps[1];
        }
        this.callingOpenai = false;
        swal.close();
        //window.scrollTo(0, 0);
        this.lauchEvent("Search Disease");
        await this.delay(200);
        this.scrollTo();
        this.showInputRecalculate = false;
        localStorage.setItem('sentFeedback', 'true')
    }

    cancelEdit() {
        this.showInputRecalculate = false;
        this.medicalText2 = '';
    }

    setDiseaseListEn(text){
        let parseChoices = text.split("+");
        for (let i = 0; i < parseChoices.length; i++) {
            if (parseChoices[i] != '' && parseChoices[i] != "\n\n" && parseChoices[i] != "\n" && parseChoices[i].length>3) {
                let index = parseChoices[i].indexOf(':');
                let firstPart = parseChoices[i].substring(0, index);
                this.diseaseListEn.push(firstPart)
            }
        }
    }

    loadMore() {
        var diseases = '';
        for (let i = 0; i < this.diseaseListEn.length; i++) {
            diseases = diseases + '+' +this.diseaseListEn[i] + ', ';
        }
        let paramIntroText = this.optionRare;
        if (this.selectorRare) {
            paramIntroText = this.optionCommon;
        }
        this.temppremedicalText = this.copyMedicalText + '. ' + "Each must have this format '\n\n+"+(this.diseaseListEn.length+1)+".' for each potencial "+paramIntroText+". The list is: "+ diseases;
        this.loadMoreDiseases = true;
        this.continuePreparingCallOpenAi('step3');
    }

    async scrollTo() {
        await this.delay(400);
        document.getElementById('initsteps').scrollIntoView({ behavior: "smooth" });
    }



    cancelCallQuestion(){
        this.symptomsDifferencial = [];
        this.answerOpenai = '';
        this.loadingAnswerOpenai = false;
        this.selectedQuestion = '';
        this.subscription.unsubscribe();
        this.subscription = new Subscription();
    }

    showQuestion(question, index) {
        /*var testRes= {"id":"cmpl-6KmXVRaPvar50l7SgRNVTiosKsCiQ","object":"text_completion","created":1670411165,"model":"text-davinci-003","choices":[{"text":"\n\nCommon symptoms of Dravet Syndrome include:\n\n-Frequent and/or prolonged seizures\n-Developmental delays\n-Speech delays\n-Behavioral and social challenges\n-Sleep disturbances\n-Growth and nutrition issues\n-Sensory integration dysfunction\n-Movement and balance issues\n-Weak muscle tone (hypotonia)\n-Delayed motor skills","index":0,"logprobs":null,"finish_reason":"stop"}],"usage":{"prompt_tokens":13,"completion_tokens":80,"total_tokens":93}}
        this.answerOpenai = testres.choices[0].message.content;*/
        this.symptomsDifferencial = [];
        this.answerOpenai = '';
        this.loadingAnswerOpenai = true;
        this.selectedQuestion = question.question;
        var selectedDiseaseEn = this.diseaseListEn[this.selectedInfoDiseaseIndex];
        let index2 = selectedDiseaseEn.indexOf('.');
        if (index2 != -1) {
            var temp = selectedDiseaseEn.split(".");
            selectedDiseaseEn = temp[1];
        }
        var introText = question.question + ' ' + selectedDiseaseEn + '?';
        /*if(index==0){
            introText = 'What are the common symptoms for'+ selectedDiseaseEn +'? Order the list with the most probable on the top';
        }
        if(index==1){
            introText = 'Give me more information for'+ selectedDiseaseEn;
        }
        if(index==2){
            introText = 'Provide a diagnosis test for'+ selectedDiseaseEn;
        }
        if(index==3){
            introText = this.premedicalText+'. What other symptoms that the patient does not have could you find out to make a differential diagnosis of '+selectedDiseaseEn + '. Return only a list, dont return anything before or after the list, and sort it with the most likely at the top';
        }
        if(index==4){
            introText = this.premedicalText+'. Why do you think this patient has '+selectedDiseaseEn + '. Indicate the common symptoms with '+selectedDiseaseEn +' and the ones that he/she does not have';
        }*/

        if(index==0){
            introText = 'What are the common symptoms associated with'+ selectedDiseaseEn +'? Please provide a list starting with the most probable symptoms at the top.';
        }
        if(index==1){
            introText = 'Can you provide detailed information about '+ selectedDiseaseEn+' ? I am a doctor.';
        }
        if(index==2){
            introText = 'Provide a diagnosis test for'+ selectedDiseaseEn;
        }
        if(index==3){
            introText = 'Given the medical description: '+this.premedicalText+'. , what are the potential symptoms not present in the patient that could help in making a differential diagnosis for '+selectedDiseaseEn + '. Please provide only a list, starting with the most likely symptoms at the top.';
        }
        if(index==4){
            //introText = 'Based on the medical description: '+this.premedicalText+', why do you believe the patient has '+selectedDiseaseEn + '. Please indicate the symptoms common with '+selectedDiseaseEn + ' Indicate the common symptoms with '+selectedDiseaseEn +' and those the patient does not have.';
            introText = this.premedicalText+'. Why do you think this patient has '+selectedDiseaseEn + '. Indicate the common symptoms with '+selectedDiseaseEn +' and the ones that he/she does not have';
        }
        
        var value = { value: introText, myuuid: this.myuuid, operation: 'info disease', lang: this.lang }
        this.subscription.add(this.apiDx29ServerService.postOpenAi(value)
            .subscribe((res: any) => {
                if(res.choices[0].message.content){
                    let content = res.choices[0].message.content;
                    let splitChar = content.indexOf("\n\n") >= 0 ? "\n\n" : "\n";
                    let contentArray = content.split(splitChar);
    
                    // Encuentra el índice del primer punto "1."
                    let startIndex = contentArray.findIndex(item => item.trim().startsWith("1."));
    
                    // Si se encuentra el punto "1.", conserva todos los elementos a partir de ese índice
                    if (startIndex >= 0) {
                        contentArray = contentArray.slice(startIndex);
                    }
    
                    // Reconstruye el contenido
                    let parseChoices0 = contentArray.join(splitChar);
                    if(index==3){
                        if (this.detectedLang != 'en' && index==3) {
                            var jsontestLangText = [{ "Text": parseChoices0[0] }]
                            if(parseChoices0.length>1 && Array.isArray(parseChoices0)){
                                var sendInfo='';
                                for (let i = 0; i < parseChoices0.length; i++) {
                                    sendInfo = sendInfo+parseChoices0[i]+'\n';
                                }
                                jsontestLangText = [{ "Text": sendInfo}]
                            }
                            if(!Array.isArray(parseChoices0)){
                                jsontestLangText = [{ "Text": parseChoices0 }]
                            }
                            
                            this.subscription.add(this.apiDx29ServerService.getSegmentation(this.detectedLang,jsontestLangText)
                            .subscribe( (res2 : any) => {
                                
                                if (res2[0] != undefined) {
                                    if (res2[0].translations[0] != undefined) {
                                        parseChoices0 = res2[0].translations[0].text;
                                        if(parseChoices0.indexOf("1") == 0){
                                            parseChoices0 = "\n"+parseChoices0;
                                        }
                                    }
                                }
                                this.getDifferentialDiagnosis(parseChoices0);
                                this.loadingAnswerOpenai = false;
                                this.lauchEvent("Info Disease");
                            }, (err) => {
                                this.insightsService.trackException(err);
                                console.log(err);
                                this.getDifferentialDiagnosis(res.choices[0].message.content);
                                this.loadingAnswerOpenai = false;
                                this.lauchEvent("Info Disease");
                            }));
                        }else{
                            this.getDifferentialDiagnosis(res.choices[0].message.content);
                            this.loadingAnswerOpenai = false;
                            this.lauchEvent("Info Disease");
                        }
                    }else{
                        var tempInfo = res.choices[0].message.content;
                        if(parseChoices0.length>1 && Array.isArray(parseChoices0)){
                            var sendInfo='';
                            for (let i = 0; i < parseChoices0.length; i++) {
                                sendInfo = sendInfo+parseChoices0[i]+'\n';
                            }
                            tempInfo= sendInfo;
                        }else if(parseChoices0.length==1){
                            tempInfo = parseChoices0[0] 
                        }
                        var testLangText = tempInfo.substr(0, 4000)
                        this.subscription.add(this.apiDx29ServerService.getDetectLanguage(testLangText)
                    .subscribe((resdet: any) => {
                        var detectedLang2 = resdet[0].language;
                        if(this.detectedLang!=detectedLang2 || this.detectedLang!='en'){
                            var langToTrnaslate = detectedLang2;
                            if(this.detectedLang!='en'){
                                langToTrnaslate = this.detectedLang;
                            }
                            var info = [{ "Text": tempInfo}]
                            this.subscription.add(this.apiDx29ServerService.getTranslationInvert(langToTrnaslate, info)
                            .subscribe((res2: any) => {
                                var textToTA = this.premedicalText.replace(/\n/g, " ");
                                if (res2[0] != undefined) {
                                    if (res2[0].translations[0] != undefined) {
                                        textToTA = res2[0].translations[0].text;
                                    }
                                }
                                this.answerOpenai = textToTA;
                               
                                this.loadingAnswerOpenai = false;
                                this.lauchEvent("Info Disease");
                            }, (err) => {
                                this.insightsService.trackException(err);
                                console.log(err);
                                if(parseChoices0.length>1 && Array.isArray(parseChoices0)){
                                    var sendInfo='';
                                    for (let i = 0; i < parseChoices0.length; i++) {
                                        sendInfo = sendInfo+parseChoices0[i]+'\n';
                                    }
                                    this.answerOpenai = sendInfo;
                                }else if(parseChoices0.length==1){
                                    this.answerOpenai = parseChoices0[0] 
                                }else{
                                    this.answerOpenai = res.choices[0].message.content;
                                }
                                
                                this.loadingAnswerOpenai = false;
                                this.lauchEvent("Info Disease");
                            }));
                        }else{
                            this.answerOpenai = tempInfo;
                                
                            this.loadingAnswerOpenai = false;
                            this.lauchEvent("Info Disease");
                        }
                        }, (err) => {
                            this.insightsService.trackException(err);
                            console.log(err);
                            this.answerOpenai = tempInfo;
                                
                            this.loadingAnswerOpenai = false;
                            this.lauchEvent("Info Disease");
                        }));
                        
                        
    
                        
                    }
                    
                }else{
                    this.loadingAnswerOpenai = false;
                    swal({
                        type: 'error',
                        text: "Nous ne pouvons pas répondre à cette question pour le moment. Veuillez essayer un autre jour pour nous donner le temps de régler le problème. Dans l'intervalle, vous pouvez choisir une autre option. Si vous avez besoin d'une aide immédiate, veuillez écrire à notre équipe d'assistance : support@foundation29.org Nous sommes désolés pour la gêne occasionnée.",
                        showCancelButton: false,
                        showConfirmButton: true,
                        allowOutsideClick: false
                    })
                }
                

                
            }, (err) => {
                this.insightsService.trackException(err);
                console.log(err);
                this.loadingAnswerOpenai = false;
            }));

    }

    getDifferentialDiagnosis(info){
        var parseChoices = info.split("\n");
        this.symptomsDifferencial = [];
        for (let i = 0; i < parseChoices.length; i++) {
            if (parseChoices[i] != '' && parseChoices[i] != ' ' && parseChoices[i] != ':') {
                let index = parseChoices[i].indexOf('.');
                var name = parseChoices[i].split(".")[1];
                if (index != -1) {
                    name = parseChoices[i].substring(index + 1, parseChoices[i].length);
                }
                //if last char is a dot remove it
                if (name.charAt(name.length - 1) == '.') {
                    name = name.substring(0, name.length - 1);
                }
                //if last char is a space remove it
                if (name.charAt(name.length - 1) == ' ') {
                    name = name.substring(0, name.length - 1);
                }
                this.symptomsDifferencial.push({name:name, checked: false})
            }
        }
    }

    changeSymptom(event,index){
     console.log(event); 
    }

    recalculateDifferencial(){
        var newSymptoms = '';
        for(let i=0;i<this.symptomsDifferencial.length;i++){
            if(this.symptomsDifferencial[i].checked){
                newSymptoms= newSymptoms+this.symptomsDifferencial[i].name+', ';
            }
        }
        //si el último elemento es un espacio, eliminarlo
        if(newSymptoms.charAt(newSymptoms.length - 1) == ' '){
            newSymptoms = newSymptoms.substring(0, newSymptoms.length - 1);
        }
        // si es el último elemento, no añadir la coma
        if(newSymptoms.charAt(newSymptoms.length - 1) == ','){
            newSymptoms = newSymptoms.substring(0, newSymptoms.length - 1);
        }
        if(newSymptoms!=''){
            this.lauchEvent("Recalculate Differencial");
            this.optionSelected = this.options[0];
            this.closeDiseaseUndiagnosed();

            this.medicalText2 = newSymptoms;
            this.verifCallOpenAi2();
        }else{
            swal({
                type: 'error',
                text: this.translate.instant("land.Select at least one symptom"),
                showCancelButton: false,
                showConfirmButton: true,
                allowOutsideClick: false
            })
        }
        
    }

    async recalculate(option) {
        this.showInputRecalculate = true;
        this.optionSelected = this.options[option];
        //this.focusTextArea();
        /*await this.delay(200);
        document.getElementById('optionssteps').scrollIntoView({ behavior: "smooth" });*/
    }

    clearText2() {
        this.medicalText2 = '';
        this.medicalText2Copy = '';
        this.showErrorCall2 = false;
        document.getElementById("textarea2").setAttribute("style", "height:50px;overflow-y:hidden; width: 100%;");
    }

    verifCallOpenAi2() {
        this.showErrorCall2 = false;
        if (this.callingOpenai || this.medicalText2.length == 0) {
            this.showErrorCall2 = true;
            let text = this.translate.instant("land.required");
            swal({
                type: 'error',
                text: text,
                showCancelButton: false,
                showConfirmButton: true,
                allowOutsideClick: false
            })
        }
        if (!this.showErrorCall2) {
            this.callOpenAi2();
        }
    }

    callOpenAi2() {
        //this.medicalText = this.copyMedicalText + '. ' + this.optionSelected.value + ' ' + this.medicalText2;
        if (this.medicalText2.length > 0) {
            swal({
                title: this.translate.instant("generics.Please wait"),
                showCancelButton: false,
                showConfirmButton: false,
                allowOutsideClick: false
            }).then((result) => {
    
            });
            this.medicalText2Copy = this.medicalText2;
            this.subscription.add(this.apiDx29ServerService.getDetectLanguage(this.medicalText2)
                .subscribe((res: any) => {
                    if (res[0].language != 'en') {
                        this.detectedLang = res[0].language;
                        var info = [{ "Text": this.medicalText2 }]
                        this.subscription.add(this.apiDx29ServerService.getTranslationDictionary(res[0].language, info)
                            .subscribe((res2: any) => {
                                var textToTA = this.medicalText2.replace(/\n/g, " ");
                                if (res2[0] != undefined) {
                                    if (res2[0].translations[0] != undefined) {
                                        textToTA = res2[0].translations[0].text;
                                    }
                                }
                                this.medicalText2Copy = textToTA;
                                this.preparingCallOpenAi('step4');
                            }, (err) => {
                                this.insightsService.trackException(err);
                                console.log(err);
                                this.preparingCallOpenAi('step4');
                            }));
                    } else {
                        this.preparingCallOpenAi('step4');
                    }

                }, (err) => {
                    this.preparingCallOpenAi('step4');
                    
                }));
        } else {
            this.preparingCallOpenAi('step4');
        }
            
        
    }

    focusTextArea() {
        setTimeout(function () {
            this.inputTextAreaElement.nativeElement.focus();
        }.bind(this), 200);
    }

    closeDiseaseUndiagnosed() {
        if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
        }
    }

    restartAllVars() {
        this.topRelatedConditions = [];
    }

    showMoreInfoDiseasePopup(diseaseIndex, contentInfoDisease) {
        if(this.callingAnonymize){
            this.tienePrisa = true;
            swal({
                type: 'warning',
                text: "Nous vérifions s'il y a des données à anonymiser, attendez quelques secondes pour que le processus d'anonymisation se termine.",
                showCancelButton: false,
                showConfirmButton: true,
                allowOutsideClick: false
            })
        }else{
            this.answerOpenai = '';
            this.symptomsDifferencial = [];
            this.selectedInfoDiseaseIndex = diseaseIndex;
            var nameEvent = 'Undiagnosed - Select Disease - ' + this.topRelatedConditions[this.selectedInfoDiseaseIndex].name;
            this.lauchEvent(nameEvent);
            let ngbModalOptions: NgbModalOptions = {
                backdrop: 'static',
                keyboard: false,
                windowClass: 'ModalClass-lg'// xl, lg, sm
            };
            if (this.modalReference != undefined) {
                this.modalReference.close();
                this.modalReference = undefined;
            }
            this.modalReference = this.modalService.open(contentInfoDisease, ngbModalOptions);
            //split number on string like 1.dravet 2.duchenne
            this.selectedDisease = this.topRelatedConditions[this.selectedInfoDiseaseIndex].content.split(/\d+\./)[1];
            
            //split ( on selected disease
            //this.selectedDisease = this.selectedDisease.split(' (')[0];
            this.selectedDisease = this.selectedDisease.split(':')[0];
        }
        
    }

    copyResults() {
        var finalReport = "";
        var infoDiseases = this.getPlainInfoDiseases2();
        if (infoDiseases != "") {
            finalReport = this.translate.instant("diagnosis.Proposed diagnoses") + ":\n" + infoDiseases;
        }

        const textarea = document.createElement('textarea');
        textarea.textContent = finalReport;
        document.body.appendChild(textarea);
        textarea.select();

        try {
        document.execCommand('copy');
        swal({
            type: 'success',
            html: this.translate.instant("land.Results copied to the clipboard"),
            showCancelButton: false,
            showConfirmButton: false,
            allowOutsideClick: false
        })
        setTimeout(function () {
            swal.close();
        }, 2000);
        this.lauchEvent("Copy results");
        } catch (err) {
        console.error('No se pudo copiar el texto: ', err);
        }

        document.body.removeChild(textarea);
        

    }

    getPlainInfoDiseases2() {
        var resCopy = "";
        for (let i = 0; i < this.topRelatedConditions.length; i++) {
            resCopy = resCopy + this.topRelatedConditions[i].name;
            if (i + 1 < this.topRelatedConditions.length) {
                resCopy = resCopy + "\n";
            }
        }
        return resCopy;
    }

    downloadResults() {
        if(!this.callingAnonymize){
            let infoDiseases = this.getDiseaseInfo(this.topRelatedConditions);
            this.jsPDFService.generateResultsPDF(this.medicalText, infoDiseases, this.lang)
            this.lauchEvent("Download results");
        }
        
    }

    getDiseaseInfo(diseases: any[]): { name: string, description: string }[] {
        return diseases.map(disease => {
            const matches = disease.content.match(/<\/strong>([\s\S]*?)(\n\n|$)/);
            const description = matches && matches[1].trim() || '';
            return {
              name: disease.name,
              description: description
            };
        });
    }

    getLiteral(literal) {
        return this.translate.instant(literal);
    }

    vote(valueVote, contentFeedbackDown) {
        //this.modalReference =this.modalService.open(contentFeedbackDown, { size: 'sm' });
        //this.modalReference = this.modalService.open(contentFeedbackDown, ngbModalOptions);

        this.sendingVote = true;

        var value = { myuuid: this.myuuid, vote: valueVote }        
        this.subscription.add(this.apiDx29ServerService.opinion(value)
            .subscribe((res: any) => {
                this.voteId = res.id;
                this.lauchEvent("Vote: " + valueVote);
                this.sendingVote = false;
                let ngbModalOptions: NgbModalOptions = {
                    backdrop: 'static',
                    keyboard: false,
                    windowClass: 'ModalClass-sm offset-md-3 col-md-6'// xl, lg, sm
                  };
                this.lastVote= valueVote;
                this.modalReference = this.modalService.open(contentFeedbackDown, ngbModalOptions);
                /*if (valueVote == 'down') {
                    let ngbModalOptions: NgbModalOptions = {
                        backdrop: 'static',
                        keyboard: false,
                        windowClass: 'ModalClass-sm offset-md-3 col-md-6'// xl, lg, sm
                      };
                    this.modalReference = this.modalService.open(contentFeedbackDown, ngbModalOptions);
                } else {
                    swal({
                        type: 'success',
                        html: this.translate.instant("land.thanks"),
                        showCancelButton: false,
                        showConfirmButton: false,
                        allowOutsideClick: false
                    })
                    setTimeout(function () {
                        swal.close();
                    }, 2000);
                }*/

            }, (err) => {
                this.insightsService.trackException(err);
                console.log(err);
                this.sendingVote = false;
            }));
    }

    submitInvalidForm() {
        this.showErrorForm = true;
        if (!this.feedbackDownForm) { return; }
        const base = this.feedbackDownForm;
        for (const field in base.form.controls) {
            if (!base.form.controls[field].valid) {
                base.form.controls[field].markAsTouched()
            }
        }
    }

    onSubmitFeedbackDown() {
        this.showErrorForm = false;
        this.sending = true;
        var value = { description: this.feedBack1input, voteId: this.voteId }
        this.subscription.add(this.apiDx29ServerService.feedback(value)
            .subscribe((res: any) => {
                this.lauchEvent("Feedback");
                this.sending = false;
                this.feedBack1input = '';
                if (this.modalReference != undefined) {
                    this.modalReference.close();
                    this.modalReference = undefined;
                }

                swal({
                    type: 'success',
                    html: this.translate.instant("land.thanks"),
                    showCancelButton: false,
                    showConfirmButton: false,
                    allowOutsideClick: false
                })
                setTimeout(function () {
                    swal.close();
                }, 2000);
            }, (err) => {
                this.insightsService.trackException(err);
                console.log(err);
                this.sending = false;
            }));


    }

    closeFeedback() {
        if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
        }
        swal({
            type: 'success',
            html: this.translate.instant("land.thanks"),
            showCancelButton: false,
            showConfirmButton: false,
            allowOutsideClick: false
        })
        setTimeout(function () {
            swal.close();
        }, 2000);
    }

    resizeTextArea(){
        this.resizeTextAreaFunc(this.textAreas);
    }

    resizeTextArea2(){
        this.resizeTextAreaFunc(this.textAreas2);
    }

    private resizeTextAreaFunc(elements: QueryList<ElementRef>) {
        elements.forEach((element: ElementRef) => {
          const nativeElement = element.nativeElement;
          this.renderer.listen(nativeElement, 'input', () => {
            let height = nativeElement.scrollHeight;
            if (height < 50) height = 50;
            this.renderer.setStyle(nativeElement, 'height', `${height}px`);
          });
          let height = nativeElement.scrollHeight;
          if (height < 50) height = 50;
          this.renderer.setStyle(nativeElement, 'height', `${height}px`);
        });
      }

    selectorRareEvent(event) {
        this.selectorRare = event;
    }

    selectorRareEvent2(event) {
        this.selectorRare = event;
        this.prevSelectorRare = this.selectorRare;
        this.verifCallOpenAi('step2');
    }

      showContentInfoAPP(contentInfoAPP) {
        var nameEvent = 'showContentInfoAPP';
        this.lauchEvent(nameEvent);
        let ngbModalOptions: NgbModalOptions = {
            backdrop: 'static',
            keyboard: false,
            windowClass: 'ModalClass-lg'// xl, lg, sm
        };
        if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
        }
        this.modalReference = this.modalService.open(contentInfoAPP, ngbModalOptions);
        
    }

    callAnonymize(value, response){
        this.callingAnonymize = true;
        this.hasAnonymize = false;
        this.resultAnonymized = '';
        this.copyResultAnonymized = '';
        var info = { value: this.medicalText, myuuid: value.myuuid, operation: value.operation, lang: this.lang, response: response }
        this.subscription.add(this.apiDx29ServerService.postAnonymize(info)
            .subscribe((res: any) => {
                let parseChoices = res.choices[0].message.content;
                parseChoices = parseChoices.replace(/^"""\n/, '').replace(/\s*"""$/, '');
                let parts = parseChoices.split(/(\[ANON-\d+\])/g);
                let partsCopy = parseChoices.split(/(\[ANON-\d+\])/g);
                if(parts.length>1){
                    for (let i = 0; i < parts.length; i++) {
                        if (/\[ANON-\d+\]/.test(parts[i])) {
                          let length = parseInt(parts[i].match(/\d+/)[0]);
                          let blackSpan = '<span style="background-color: black; display: inline-block; width:' + length + 'em;">&nbsp;</span>';
                          parts[i] = blackSpan;
                          // Agregamos la parte de los asteriscos
                          let asterisks = '*'.repeat(length);
                          partsCopy[i] = asterisks;
                        }
                      }
                      this.resultAnonymized = parts.join('');
                      this.resultAnonymized =  this.resultAnonymized.replace(/\n/g, '<br>');

                      this.copyResultAnonymized = partsCopy.join('');
                      this.copyResultAnonymized =  this.copyResultAnonymized.replace(/\n/g, '<br>');
                      this.medicalText = this.copyResultAnonymized;
                      this.premedicalText = this.copyResultAnonymized;
                      this.callingAnonymize = false;
                      this.hasAnonymize = true;
                      if (!localStorage.getItem('dontShowSwal')) {
                        swal({
                            type: 'info',
                            html: '<p>Nous avons détecté des informations personnelles dans la description clinique que vous avez saisie.</p><p>Nous avons procédé à la suppression de ces informations et enregistré le texte anonymisé.</p><br><br><input type= "checkbox " id="dont-show-again"> Ne plus afficher ce message.',
                            showCancelButton: false,
                            showConfirmButton: true,
                            allowOutsideClick: false
                        }).then((result) => {
                            if ((document.getElementById('dont-show-again') as HTMLInputElement).checked) {
                                // Aquí puedes almacenar la preferencia del usuario, por ejemplo en localStorage
                                localStorage.setItem('dontShowSwal', 'true');
                            }
                        });
                      }else{
                        this.mostrarFinalizacionAnonimizado(true);
                      }
                     
                    
                }else{
                    this.callingAnonymize = false;
                    this.hasAnonymize = false;
                    this.mostrarFinalizacionAnonimizado(false);
                }
                
            }, (err) => {
                console.log(err);
                this.insightsService.trackException(err);
                this.callingAnonymize = false;
                this.hasAnonymize = false;
                this.mostrarFinalizacionAnonimizado(false);
            }));
    }

    mostrarFinalizacionAnonimizado(detectedText){
        if(this.tienePrisa){
            if(detectedText){
                swal({
                    type: 'success',
                    html: '<p>Le texte a été correctement anonymisé.</p>',
                    showCancelButton: false,
                    showConfirmButton: true,
                    allowOutsideClick: false
                }).then((result) => {
                    if (this.modalReference != undefined) {
                        this.modalReference.close();
                        this.modalReference = undefined;
                    }
                });
            }else{
                swal({
                    type: 'success',
                    html: "<p>Nous n'avons détecté aucune information personnelle dans la description clinique que vous avez saisie.</p>",
                    showCancelButton: false,
                    showConfirmButton: true,
                    allowOutsideClick: false
                }).then((result) => {
                    if (this.modalReference != undefined) {
                        this.modalReference.close();
                        this.modalReference = undefined;
                    }
                });
            }
            this.tienePrisa = false;
        }        
    }
    openAnonymize(contentviewDoc){
        let ngbModalOptions: NgbModalOptions = {
            keyboard: false,
            windowClass: 'ModalClass-sm' // xl, lg, sm
          };
          if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
          }
          this.modalReference = this.modalService.open(contentviewDoc, ngbModalOptions);
    }

    closeModal() {
        if (this.modalReference != undefined) {
            this.modalReference.close();
            this.modalReference = undefined;
        }
      }

      copymsg() {
        const textarea = document.createElement('textarea');
        textarea.textContent = this.selectedDisease+': '+this.selectedQuestion+': '+this.answerOpenai;
        document.body.appendChild(textarea);
        textarea.select();

        try {
        document.execCommand('copy');
        swal({
            type: 'success',
            html: this.translate.instant("land.Results copied to the clipboard"),
            showCancelButton: false,
            showConfirmButton: false,
            allowOutsideClick: false
        })
        setTimeout(function () {
            swal.close();
        }, 2000);
        this.lauchEvent("Copy results");
        } catch (err) {
        console.error('No se pudo copiar el texto: ', err);
        }

        document.body.removeChild(textarea);
    }

    sendQuestionsOpinion(valueVote){
        //this.messages
        this.sendingFeedbackQuestions = true;
        let description = this.selectedDisease+': '+this.selectedQuestion+': '+this.answerOpenai;
        var value = { myuuid: this.myuuid, vote: valueVote, description: description }
        this.subscription.add(this.apiDx29ServerService.QuestionsOpinion(value)
              .subscribe((res: any) => {
                this.lauchEvent("FeedbackQuestions");
                this.sendingFeedbackQuestions = false;
                swal({
                    type: 'success',
                    html: this.translate.instant("land.thanks"),
                    showCancelButton: false,
                    showConfirmButton: false,
                    allowOutsideClick: false
                })
                setTimeout(function () {
                    swal.close();
                }, 2000);
              }, (err) => {
                  console.log(err);
                  this.insightsService.trackException(err);
                  this.sendingFeedbackQuestions = false;
              }));
      }
}
