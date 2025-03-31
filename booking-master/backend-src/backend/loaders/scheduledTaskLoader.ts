import { ScheduledTaskService } from '../services';

export async function initializeScheduledTask() {
	console.log('start run cronjob');
	ScheduledTaskService.runMessageNotification();
	ScheduledTaskService.campaignWinnerNotification();
}
