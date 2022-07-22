import {ScrollablePage} from './infinite-list.js';
import {Bar, AccountBar} from './bar.js';
import {PageHeading, PageSection, SectionPanel, SectionGroup, SectionIcon} from './page-tugs.js';
import {warningToast, DeletePlunger, errorToast, TextButton, TextInput, CopyableText, Icon, SavePlunger, Toggle, RadioList, RadioButton, infoToast, Modal, Secret, NumberInput} from './tugs.js';
import {isBadPassword} from '../../oo/snatch-oo.js';
import {setBrowserExitWarn} from '../../oo/utils.js';
import * as H from './help-texts.js';

export function Account({oo, css}, {}) {
    css(`z-index: var(--zaccount);`);
    oo(ScrollablePage)(Page);
    oo(AccountBar);
};

function Page({oo, css, go, $, res, setres}, {µ}) {
    const path = 'res/node/profile';
    res(path);

    oo(PageHeading, {i:'admin_panel_settings', title:'Account'}).onclick(() => {
        oo(Modal)
            .add(...H.account)
        ;
    });

    const snatch = µ.resourceClient.snatch;
    const profile = snatch.getProfile();
    const {userName} = profile;

    oo(PageSection, {text:'Sign out ' + userName})
        (SectionIcon)(Icon, 'logout').onclick(() => {
            µ.resourceClient.snatch.signOutAsync();
            setBrowserExitWarn(false);
            oo.timer(100, () => {
                window.location = '/';
            });
            //oo.go('/signin');
        });
    ;

    oo(PageSection, {text:'Export', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add(...H.accountExport)
            ;
        })
        (SectionIcon)(Icon, 'file_download').onclick(() => {
            alert('TODO');
        });
     ;

    oo(PageSection, {text:'Change password', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add(...H.accountPassword)
            ;
        })
        (SectionPanel)(ChangePassword)
    ;

    oo(DeleteAccountSection);
};

function ChangePassword({oo}, {µ}) { // dragonfirewillkeepsecretsafe
    let isSecondEdited;

    const getPassword = (o) => {
        const pwd = o.getText();

        if(isBadPassword(pwd)) {
            o.setError(true);
            errorToast(oo, 'Password must be at least 20 charachters long.');
        } else {
            o.setError(false);
            return pwd;
        }
    };

    const update = () => {
        if(!isSecondEdited) return;
        const
            first = getPassword(firstInput),
            sec = getPassword(secondInput);

        if(first === sec && first) {
            savePlunger.setData(first);
        } else {
            firstInput.setError(true);
            if(isSecondEdited) secondInput.setError(true);
            errorToast(oo, 'Passwords does not match.');
            savePlunger.setEnable(false);
        }
    };

    const oldInput = oo(SectionGroup)('h1', 'Current password')
            (TextInput, {type:'password'}).onUpdated(() => {
                getPassword(oldInput);
            })
    ;

    const firstInput = oo(SectionGroup)('h1', 'New password')
            (TextInput, {type:'password'}).onUpdated(() => {
                if(getPassword(firstInput)) update();
            })
    ;

    const secondInput = oo(SectionGroup)('h1', 'Re-type password')
            (TextInput, {type:'password'}).onUpdated(() => {
                isSecondEdited = true;
                if(getPassword(secondInput)) update();
            })
     ;

    const savePlunger = oo('div', {style:{textAlign:'right'}})
            (SavePlunger, {ms:1000}).onDone(async (password) => {
                const oldPassword = getPassword(oldInput);
                const snatch = µ.resourceClient.snatch;
                const profile = snatch.getProfile();
                const {userName} = profile;
                let result = await µ.resourceClient.snatch.setPasswordAsync({userName, oldPassword, password});
                if(result) {
                    oldInput.clearText();
                    firstInput.clearText();
                    secondInput.clearText();
                    µ.resourceClient.snatch.signOutAsync();
                    oo.timer(3000, () => {
                        oo.go('/signin');
                    });
                    return 'Password updated';
                }
                errorToast(oo, 'Failed to change password')
                return false;
            });
}

function DeleteAccountSection({oo, dropResAsync}, {µ}) {
    oo(PageSection, {text: 'Delete account', help:true})
        .onHelpClicked(() => {
            oo(Modal)
                .add('Delete', 'This will delete the account and the associated data from the Hotel.\n<span class="fred">Warning: This is an un-recoverable action</span>', {noescape:true});
        })
        (SectionIcon)(DeletePlunger, {ms:20000})
            .onAbort(() => {
                infoToast(oo, 'Aborted', undefined, undefined, true);
                return false;
            })
            .onevent('click', () => {
                warningToast(oo, 'Deleting account in 20 seconds. Press X to abort', 19000);
            })
            .onDone(async ({oo}) => {
                oo.setEnable(false);
                dropResAsync('res/hotel/destroy/app');
                infoToast(oo, 'Goodbye');
                oo.timer(5000, () => {
                    µ.resourceClient.snatch.signOutAsync(false);
                    setBrowserExitWarn(false);
                    window.location = '/';
                });
            });
    ;
}

